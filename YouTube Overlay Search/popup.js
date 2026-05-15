// popup.js

const results =
  document.getElementById(
    "results"
  );

// =====================================================
// RESULTS POSITION
// =====================================================

results.style.position =
  "relative";

// =====================================================
// EMPTY MESSAGE
// =====================================================

const emptyMessage =
  document.createElement(
    "div"
  );

emptyMessage.id =
  "yt-empty-message";

emptyMessage.innerText =
  "YouTube недоступен. Введите запрос в поисковик";

emptyMessage.style.display =
  "none";

emptyMessage.style.position =
  "absolute";

emptyMessage.style.left =
  "50%";

emptyMessage.style.top =
  "50%";

emptyMessage.style.transform =
  "translate(-50%, -50%)";

emptyMessage.style.width =
  "90%";

emptyMessage.style.textAlign =
  "center";

emptyMessage.style.fontSize =
  "14px";

emptyMessage.style.lineHeight =
  "1.5";

emptyMessage.style.color =
  "#bdbdbd";

emptyMessage.style.opacity =
  "0.92";

emptyMessage.style.fontFamily =
  "Arial, sans-serif";

emptyMessage.style.userSelect =
  "none";

emptyMessage.style.pointerEvents =
  "none";

results.appendChild(
  emptyMessage
);

// =====================================================
// DONATE BLOCK
// =====================================================

const donateWrap =
  document.createElement(
    "div"
  );

donateWrap.style.position =
  "fixed";

donateWrap.style.right =
  "12px";

donateWrap.style.bottom =
  "10px";

donateWrap.style.display =
  "flex";

donateWrap.style.alignItems =
  "center";

donateWrap.style.gap =
  "10px";

donateWrap.style.padding =
  "10px 12px";

donateWrap.style.borderRadius =
  "14px";

donateWrap.style.background =
  "rgba(20,20,20,0.92)";

donateWrap.style.backdropFilter =
  "blur(8px)";

donateWrap.style.border =
  "1px solid rgba(255,255,255,0.08)";

donateWrap.style.boxShadow =
  "0 4px 18px rgba(0,0,0,0.35)";

donateWrap.style.zIndex =
  "999999";

const donateText =
  document.createElement(
    "div"
  );

donateText.innerText =
  "Поддержать меня";

donateText.style.fontSize =
  "12px";

donateText.style.color =
  "#d7d7d7";

donateText.style.fontFamily =
  "Arial, sans-serif";

donateText.style.whiteSpace =
  "nowrap";

donateText.style.userSelect =
  "none";

const donateButton =
  document.createElement(
    "a"
  );

donateButton.href =
  "https://www.donationalerts.com/r/flipmirror";

donateButton.target =
  "_blank";

donateButton.innerText =
  "Donate";

donateButton.style.padding =
  "7px 14px";

donateButton.style.borderRadius =
  "10px";

donateButton.style.background =
  "#ff5f5f";

donateButton.style.color =
  "white";

donateButton.style.fontSize =
  "12px";

donateButton.style.fontWeight =
  "700";

donateButton.style.letterSpacing =
  "0.2px";

donateButton.style.textDecoration =
  "none";

donateButton.style.fontFamily =
  "Arial, sans-serif";

donateButton.style.cursor =
  "pointer";

donateButton.style.transition =
  "all 0.15s ease";

donateButton.style.boxShadow =
  "0 2px 10px rgba(255,95,95,0.35)";

donateButton.onmouseenter =
  () => {

    donateButton.style.transform =
      "translateY(-1px)";

    donateButton.style.opacity =
      "0.9";

  };

donateButton.onmouseleave =
  () => {

    donateButton.style.transform =
      "translateY(0px)";

    donateButton.style.opacity =
      "1";

  };

donateWrap.appendChild(
  donateText
);

donateWrap.appendChild(
  donateButton
);

document.body.appendChild(
  donateWrap
);

let loading = false;

let nextPageToken = "";

let currentQuery = "";

let SCROLL_KEY = "";

init();

async function init(){

  const [tab] =
    await chrome.tabs.query({

      active:true,
      currentWindow:true

    });

  SCROLL_KEY =
    `popup_scroll_position_${tab.id}`;

  const saved =
    await chrome.storage.session.get(
      SCROLL_KEY
    );

  const url =
    new URL(tab.url);

  let query = "";

  if(
    url.hostname.includes(
      "google."
    )
  ){

    query =
      url.searchParams.get("q") || "";

  }

  if(
    url.hostname.includes(
      "yandex."
    )
  ){

    query =
      url.searchParams.get("text") || "";

  }

  currentQuery = query;

  if(query){

    await searchVideos(
      query
    );

    requestAnimationFrame(() => {

      results.scrollTop =
        saved?.[SCROLL_KEY] || 0;

    });

  } else {

    emptyMessage.style.display =
      "block";

  }

}

async function searchVideos(
  query,
  append = false
){

  if(loading)
    return;

  loading = true;

  try {

    const url =

      nextPageToken

        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${nextPageToken}`

        : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    const response =
      await fetch(url);

    const html =
      await response.text();

    const match =

      html.match(
        /ytInitialData"\] = (\{.*?\});/
      ) ||

      html.match(
        /ytInitialData = (\{.*?\});/
      );

    if(!match){

      if(!append){

        results.innerHTML = "";

        results.appendChild(
          emptyMessage
        );

        emptyMessage.style.display =
          "block";

      }

      loading = false;
      return;

    }

    const data =
      JSON.parse(
        match[1]
      );

    const parsed =
      parseVideos(data);

    if(
      !append
    ){

      results.innerHTML = "";

      results.appendChild(
        emptyMessage
      );

    }

    if(
      !parsed.videos.length &&
      !append
    ){

      emptyMessage.style.display =
        "block";

    } else {

      emptyMessage.style.display =
        "none";

    }

    parsed.videos.forEach(
      video => {

        const div =
          document.createElement(
            "div"
          );

        div.className =
          "video-item";

        div.innerHTML = `

          <img
            class="thumb"
            src="${video.thumbnail}"
          >

          <div class="video-info">

            <div
              class="title"
            >

              ${escapeHtml(video.title)}

            </div>

            <div class="meta">

              ${escapeHtml(video.channel)}

            </div>

          </div>

        `;

        // =====================================================
        // OPEN OVERLAY
        // =====================================================

        div.onclick =
          async () => {

            const [tab] =
              await chrome.tabs.query({

                active:true,
                currentWindow:true

              });

            try {

              await chrome.tabs.sendMessage(

                tab.id,

                {

                  type:
                    "OPEN_VIDEO",

                  videoId:
                    video.videoId

                }

              );

            } catch(e){

              // CONTENT SCRIPT NOT READY

              try {

                await chrome.scripting.insertCSS({

                  target:{
                    tabId:tab.id
                  },

                  files:[
                    "overlay.css"
                  ]

                });

              } catch(e){}

              try {

                await chrome.scripting.executeScript({

                  target:{
                    tabId:tab.id
                  },

                  files:[
                    "content.js"
                  ]

                });

              } catch(e){}

              await new Promise(
                r => setTimeout(r, 120)
              );

              chrome.tabs.sendMessage(

                tab.id,

                {

                  type:
                    "OPEN_VIDEO",

                  videoId:
                    video.videoId

                }

              );

            }

          };

        results.appendChild(
          div
        );

        const titleEl =
          div.querySelector(
            ".title"
          );

        setTimeout(() => {

          const isOverflowing =

            titleEl.scrollHeight >
            titleEl.clientHeight + 2 ||

            titleEl.scrollWidth >
            titleEl.clientWidth + 2;

          if(isOverflowing){

            div.title =
              video.title;

          }

        }, 50);

      }
    );

    nextPageToken =
      parsed.nextPageToken || "";

  } catch(e){

    console.error(e);

    if(!append){

      results.innerHTML = "";

      results.appendChild(
        emptyMessage
      );

      emptyMessage.style.display =
        "block";

    }

  }

  loading = false;

}

results.addEventListener(
  "scroll",
  async () => {

    await chrome.storage.session.set({

      [SCROLL_KEY]:
        results.scrollTop

    });

    const nearBottom =

      results.scrollTop +
      results.clientHeight >=

      results.scrollHeight - 250;

    if(
      nearBottom &&
      !loading &&
      nextPageToken
    ){

      await searchVideos(
        currentQuery,
        true
      );

    }

  }
);

function parseVideos(obj){

  const result = {

    videos:[],
    nextPageToken:""

  };

  function walk(node){

    if(
      !node ||
      typeof node !== "object"
    ) return;

    if(
      node.videoRenderer
    ){

      const v =
        node.videoRenderer;

      result.videos.push({

        videoId:
          v.videoId,

        title:
          v.title
            ?.runs?.[0]?.text || "",

        channel:
          v.ownerText
            ?.runs?.[0]?.text || "",

        thumbnail:
          v.thumbnail
            ?.thumbnails?.pop()?.url || ""

      });

    }

    if(
      node.continuationItemRenderer
        ?.continuationEndpoint
        ?.continuationCommand
        ?.token
    ){

      result.nextPageToken =

        node
          .continuationItemRenderer
          .continuationEndpoint
          .continuationCommand
          .token;

    }

    for(
      const key in node
    ){

      walk(node[key]);

    }

  }

  walk(obj);

  return result;

}

function escapeHtml(str){

  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");

}