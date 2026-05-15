// background.js

let activePopupId = null;
let activeMoveListener = null;

let restoreFocusTimer = null;

/*
  БЫЛО ЛИ ОКНО
  MAXIMIZED ДО OVERLAY
*/
let shouldRestoreMaximized = false;

/*
  СОХРАНЯЕМ ИСХОДНЫЕ
  РАЗМЕРЫ ОКНА
*/
let originalWindowBounds = null;

/*
  НА СКОЛЬКО УМЕНЬШАЕМ
  ВЫСОТУ ОКНА СНИЗУ
*/
const COMMENTS_STRIP_HEIGHT = 28;

chrome.runtime.onMessage.addListener(
  (
    message,
    sender,
    sendResponse
  ) => {

    if (
      message.type ===
      "CHECK_VIDEO"
    ) {

      checkVideo(
        message.videoId
      ).then(
        blocked => {

          sendResponse({
            blocked
          });

        }
      );

      return true;

    }

    if (
      message.type ===
      "LOAD_COMMENTS"
    ) {

      streamComments(
        message.videoId,
        sender.tab.id
      );

      return true;

    }

    if (
      message.type ===
      "CLOSE_COMMENTS_WINDOW"
    ) {

      closeCommentsWindow();

      return true;

    }

  }
);

async function closeCommentsWindow(){

  if(activeMoveListener){

    chrome.windows.onBoundsChanged.removeListener(
      activeMoveListener
    );

    activeMoveListener = null;

  }

  if(activePopupId){

    try {

      await chrome.windows.remove(
        activePopupId
      );

    } catch(e){}

    activePopupId = null;

  }

  /*
    ВОЗВРАЩАЕМ MAXIMIZED
    ТОЛЬКО ЕСЛИ ОН БЫЛ
  */
  if(
    shouldRestoreMaximized &&
    originalWindowBounds
  ){

    try {

      await chrome.windows.update(

        originalWindowBounds.id,

        {
          state:"maximized"
        }

      );

    } catch(e){}

  }

  shouldRestoreMaximized = false;
  originalWindowBounds = null;

}

async function restoreMainFocus(
  mainWindowId
){

  try {

    if(
      restoreFocusTimer
    ){

      clearTimeout(
        restoreFocusTimer
      );

    }

    restoreFocusTimer =
      setTimeout(async () => {

        try {

          await chrome.windows.update(

            mainWindowId,

            {
              focused:true
            }

          );

        } catch(e){}

      }, 60);

  } catch(e){}

}

async function checkVideo(
  videoId
){

  try {

    const response =
      await fetch(
        `https://www.youtube.com/watch?v=${videoId}`
      );

    const html =
      await response.text();

    const lower =
      html.toLowerCase();

    return (

      lower.includes(
        "og:restrictions:age"
      ) ||

      lower.includes(
        "sign in to confirm your age"
      ) ||

      lower.includes(
        "\"isagerestricted\":true"
      ) ||

      lower.includes(
        "\"age_restricted\""
      )

    );

  } catch(e){

    return false;

  }

}

async function streamComments(
  videoId,
  originalTabId
) {

  await closeCommentsWindow();

  const originalTab =
    await chrome.tabs.get(
      originalTabId
    );

  let current =
    await chrome.windows.get(
      originalTab.windowId
    );

  const mainWindowId =
    current.id;

  /*
    СОХРАНЯЕМ
    ИСХОДНОЕ СОСТОЯНИЕ
  */
  shouldRestoreMaximized =
    current.state === "maximized";

  originalWindowBounds = {

    id:current.id,

    left:current.left,
    top:current.top,

    width:current.width,
    height:current.height,

    state:current.state

  };

  /*
    ЕСЛИ ОКНО MAXIMIZED
    ДЕЛАЕМ ЕГО ЧУТЬ НИЖЕ,
    ЧТОБЫ СНИЗУ БЫЛА
    ПОЛОСА ДЛЯ КОММЕНТОВ
  */
  if(
    current.state ===
    "maximized"
  ){

    try {

      await chrome.windows.update(

        mainWindowId,

        {

          state:"normal",

          left:
            current.left,

          top:
            current.top,

          width:
            current.width,

          height:
            current.height -
            COMMENTS_STRIP_HEIGHT

        }

      );

      await delay(350);

      current =
        await chrome.windows.get(
          mainWindowId
        );

    } catch(e){

      console.log(
        "resize error",
        e
      );

    }

  }

  const popup =
    await chrome.windows.create({

      url:
        `https://www.youtube.com/watch?v=${videoId}`,

      type:"popup",

      focused:false,

      width:
        current.width,

      height:
        current.height,

      left:
        current.left,

      top:
        current.top + 2

    });

  activePopupId =
    popup.id;

  const moveListener =
    async movedWindow => {

      try {

        if(
          movedWindow.id !==
          mainWindowId
        ) return;

        if(
          activePopupId !==
          popup.id
        ){

          return;

        }

        if(
          movedWindow.state ===
          "minimized"
        ){

          try {

            await chrome.windows.update(

              popup.id,

              {
                state:"minimized"
              }

            );

          } catch(e){}

          return;

        }

        /*
          ЕСЛИ ПОЛЬЗОВАТЕЛЬ
          СНОВА MAXIMIZED
        */
        if(
          movedWindow.state ===
          "maximized"
        ){

          try {

            await chrome.windows.update(

              mainWindowId,

              {

                state:"normal",

                left:
                  movedWindow.left,

                top:
                  movedWindow.top,

                width:
                  movedWindow.width,

                height:
                  movedWindow.height -
                  COMMENTS_STRIP_HEIGHT

              }

            );

            await delay(250);

            movedWindow =
              await chrome.windows.get(
                mainWindowId
              );

          } catch(e){}

        }

        if(
          movedWindow.state !==
          "normal"
        ){

          return;

        }

        try {

          await chrome.windows.update(

            popup.id,

            {

              state:"normal",

              left:
                movedWindow.left,

              top:
                movedWindow.top + 2,

              width:
                movedWindow.width,

              height:
                movedWindow.height,

              focused:false

            }

          );

        } catch(e){}

        await restoreMainFocus(
          mainWindowId
        );

      } catch(e){}

    };

  chrome.windows.onBoundsChanged.addListener(
    moveListener
  );

  activeMoveListener =
    moveListener;

  const watchdog =
    setInterval(async () => {

      try {

        await chrome.tabs.get(
          originalTabId
        );

      } catch(e){

        clearInterval(
          watchdog
        );

        await closeCommentsWindow();

      }

    },
    1200
  );

  const tempTab =
    popup.tabs[0];

  try {

    await chrome.tabs.update(
      tempTab.id,
      {
        muted: true
      }
    );

  } catch(e){}

  try {

    await delay(1500);

    await chrome.scripting.executeScript({

      target:{
        tabId:tempTab.id
      },

      func:() => {

        document.documentElement.style.background =
          "rgba(0,0,0,0.92)";

        document.body.style.background =
          "rgba(0,0,0,0.92)";

        /*
          НЕ ЛОМАЕМ СКРОЛЛ
        */
        document.documentElement.style.overflowY =
          "auto";

        document.body.style.overflowY =
          "auto";

        const removeHeavyBlocks = () => {

          const selectors = [

            "#secondary",

            "#related",

            "ytd-watch-next-secondary-results-renderer",

            "#items.ytd-watch-next-secondary-results-renderer",

            "#chat",

            "ytd-merch-shelf-renderer",

            "ytd-compact-video-renderer",

            "ytd-rich-item-renderer",

            "#panels",

            "#playlist",

            "tp-yt-paper-dialog"

          ];

          selectors.forEach(selector => {

            document
              .querySelectorAll(selector)
              .forEach(el => el.remove());

          });

        };

        removeHeavyBlocks();

        setInterval(
          removeHeavyBlocks,
          1200
        );

        if(
          !document.getElementById(
            "yt-dark-overlay"
          )
        ){

          const overlay =
            document.createElement(
              "div"
            );

          overlay.id =
            "yt-dark-overlay";

          overlay.style.position =
            "fixed";

          overlay.style.left = "0";
          overlay.style.top = "0";

          overlay.style.width =
            "100vw";

          overlay.style.height =
            "100vh";

          overlay.style.background =
            "black";

          overlay.style.opacity =
            "0.82";

          overlay.style.pointerEvents =
            "none";

          overlay.style.zIndex =
            "9999";

          document.documentElement.appendChild(
            overlay
          );

        }

        const commentsContainer =
          document.querySelector(
            "#comments"
          );

        if(commentsContainer){

          commentsContainer.style.zIndex =
            "9999999";

          commentsContainer.style.position =
            "relative";

        }

        const killVideo = () => {

          document
            .querySelectorAll("video")
            .forEach(video => {

              try {

                video.autoplay = false;

                video.muted = true;

                video.volume = 0;

                video.pause();

                video.currentTime = 0;

              } catch(e){}

            });

        };

        killVideo();

        setInterval(
          killVideo,
          80
        );

      }

    });

    await delay(800);

    const sent =
      new Set();

    let lastCount = 0;
    let stable = 0;

    for(
      let i = 0;
      i < 120;
      i++
    ){

      try {

        await chrome.windows.get(
          popup.id
        );

      } catch(e){

        clearInterval(
          watchdog
        );

        activePopupId = null;

        return;

      }

      await chrome.scripting.executeScript({

        target:{
          tabId:tempTab.id
        },

        func:() => {

          window.scrollBy(
            0,
            5000
          );

        }

      });

      await delay(140);

      const result =
        await chrome.scripting.executeScript({

          target:{
            tabId:tempTab.id
          },

          func:async () => {

            document
              .querySelectorAll("img")
              .forEach(img => {

                if(
                  img.loading === "lazy"
                ){

                  img.loading = "eager";

                }

                img.decoding = "sync";

              });

            const sleep = ms =>
              new Promise(r => setTimeout(r, ms));

            const replyButtons =
              Array.from(
                document.querySelectorAll(
                  "#more-replies"
                )
              ).filter(btn => {

                if(
                  btn.dataset.expanded
                ) return false;

                const rect =
                  btn.getBoundingClientRect();

                const visible = (

                  rect.top >= -500 &&
                  rect.top <=
                  window.innerHeight + 500

                );

                if(!visible)
                  return false;

                const text =
                  (
                    btn.innerText ||
                    btn.textContent ||
                    ""
                  )
                  .toLowerCase();

                return (

                  text.includes("reply") ||
                  text.includes("ответ")

                );

              });

            for(const btn of replyButtons){

              btn.dataset.expanded = "1";

              try {

                btn.scrollIntoView({
                  block:"center"
                });

                await sleep(80);

                btn.click();

                await sleep(160);

              } catch(e){}

            }

            const continuations =
              document.querySelectorAll(
                "#continuation"
              );

            for(const continuation of continuations){

              try {

                continuation.scrollIntoView({
                  block:"center"
                });

                await sleep(80);

                continuation.click();

                await sleep(160);

              } catch(e){}

            }

            const threads =
              document.querySelectorAll(
                "ytd-comment-thread-renderer"
              );

            const data = [];

            threads.forEach(thread => {

              const commentId =
                thread.getAttribute("id") ||

                (
                  thread.querySelector(
                    "#author-text"
                  )?.innerText || ""
                ) +

                (
                  thread.querySelector(
                    "#content-text"
                  )?.innerText || ""
                );

              const author =
                thread.querySelector(
                  "#author-text"
                )?.innerText || "";

              const text =
                thread.querySelector(
                  "#content-text"
                )?.innerText || "";

              const img =
                thread.querySelector(
                  "#author-thumbnail img"
                ) ||

                thread.querySelector(
                  "yt-img-shadow img"
                );

              let avatar = "";

              if(img){

                avatar =
                  img.currentSrc ||
                  img.src ||
                  "";

              }

              const replies = [];

              const replyRenderers =
                thread.querySelectorAll(
                  "ytd-comment-replies-renderer ytd-comment-renderer"
                );

              replyRenderers.forEach(reply => {

                const rAuthor =
                  reply.querySelector(
                    "#author-text"
                  )?.innerText || "";

                const rText =
                  reply.querySelector(
                    "#content-text"
                  )?.innerText || "";

                const rImg =
                  reply.querySelector(
                    "#author-thumbnail img"
                  ) ||

                  reply.querySelector(
                    "yt-img-shadow img"
                  );

                let rAvatar = "";

                if(rImg){

                  rAvatar =
                    rImg.currentSrc ||
                    rImg.src ||
                    "";

                }

                if(
                  rText.trim()
                ){

                  replies.push({

                    author:rAuthor,
                    text:rText,
                    avatar:rAvatar

                  });

                }

              });

              if(
                text.trim()
              ){

                data.push({

                  id:commentId,
                  author,
                  text,
                  avatar,
                  replies

                });

              }

            });

            const remainingButtons =
              Array.from(
                document.querySelectorAll(
                  "#more-replies"
                )
              ).filter(btn => {

                if(
                  btn.dataset.expanded
                ) return false;

                const text =
                  (
                    btn.innerText ||
                    btn.textContent ||
                    ""
                  )
                  .toLowerCase();

                return (

                  text.includes("reply") ||
                  text.includes("ответ")

                );

              });

            return {

              comments:data,

              hasMoreReplies:
                remainingButtons.length > 0

            };

          }

        });

      const payload =
        result?.[0]?.result;

      if(!payload)
        continue;

      const fresh = [];

      payload.comments.forEach(
        comment => {

          const repliesKey =
            JSON.stringify(
              comment.replies || []
            );

          const key =
            (
              comment.id ||
              ""
            ) +

            comment.author +
            comment.text +
            repliesKey;

          if(
            sent.has(key)
          ) return;

          sent.add(key);

          fresh.push(comment);

        }
      );

      if(
        fresh.length
      ){

        chrome.tabs.sendMessage(

          originalTabId,

          {

            type:
              "COMMENTS_BATCH",

            comments:
              fresh

          }

        );

      }

      const count =
        payload.comments.length;

      if(
        count === lastCount
      ){

        stable++;

      } else {

        stable = 0;

      }

      lastCount = count;

      if(
        stable >= 5 &&
        !payload.hasMoreReplies
      ){

        break;

      }

    }

    await delay(200);

    clearInterval(
      watchdog
    );

    await closeCommentsWindow();

  } catch(e){

    clearInterval(
      watchdog
    );

    await closeCommentsWindow();

  }

}

function delay(ms){

  return new Promise(
    r => setTimeout(r, ms)
  );

}

chrome.webNavigation.onCommitted.addListener(
  async details => {

    if(
      details.frameId !== 0
    ) return;

    const tab =
      await chrome.tabs.get(
        details.tabId
      );

    if(
      !tab.url
    ) return;

    if(

      !tab.url.includes(
        "google."
      ) &&

      !tab.url.includes(
        "yandex."
      )

    ) return;

    const scrollKey =
      `popup_scroll_position_${details.tabId}`;

    await chrome.storage.session.remove(
      scrollKey
    );

  }
);