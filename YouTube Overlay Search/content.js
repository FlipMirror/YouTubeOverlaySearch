// content.js

const rendered =
  new Set();

chrome.runtime.onMessage.addListener(
  (
    message
  ) => {

    if(
      message.type ===
      "OPEN_VIDEO"
    ){

      chrome.runtime.sendMessage(

        {

          type:
            "CHECK_VIDEO",

          videoId:
            message.videoId

        },

        result => {

          if(
            result?.blocked
          ){

            window.open(

              `https://www.youtube.com/watch?v=${message.videoId}`,

              "_blank"

            );

            return;

          }

          openOverlay(
            message.videoId
          );

        }

      );

    }

    if(
      message.type ===
      "COMMENTS_BATCH"
    ){

      appendComments(
        message.comments
      );

    }

  }
);

function closeAutoscrollWindow(){

  chrome.runtime.sendMessage({

    type:
      "CLOSE_COMMENTS_WINDOW"

  });

}

function openOverlay(videoId){

  const old =
    document.getElementById(
      "ytOverlay"
    );

  if(old){

    document.body.style.overflow =
      "";

    old.remove();

  }

  rendered.clear();

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "ytOverlay";

  overlay.innerHTML = `

    <div id="ytBackdrop"></div>

    <div id="ytModal">

      <button id="ytClose">
        ✕
      </button>

      <div id="ytVideo">

        <iframe
          id="ytFrame"
          src="
            https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0
          "
          allowfullscreen
          allow="autoplay"
        ></iframe>

      </div>

      <div id="ytComments">

        <div id="ytCommentsHeader">
          Комментарии
        </div>

        <div id="ytCommentsLoader">

          Загрузка комментариев
          <span id="ytDots"></span>

        </div>

        <div id="ytCommentsContent"></div>

      </div>

    </div>

  `;

  document.body.appendChild(
    overlay
  );

  document.body.style.overflow =
    "hidden";

  injectStyles();

  document
    .getElementById(
      "ytClose"
    )
    .onclick =
      () => {

        closeAutoscrollWindow();

        document.body.style.overflow =
          "";

        overlay.remove();

      };

  document
    .getElementById(
      "ytBackdrop"
    )
    .onclick =
      () => {

        closeAutoscrollWindow();

        document.body.style.overflow =
          "";

        overlay.remove();

      };

  chrome.runtime.sendMessage({

    type:
      "LOAD_COMMENTS",

    videoId

  });

}

function appendComments(
  comments
){

  const container =
    document.getElementById(
      "ytCommentsContent"
    );

  if(!container)
    return;

  const loader =
    document.getElementById(
      "ytCommentsLoader"
    );

  if(loader){

    loader.style.display =
      "none";

  }

  comments.forEach(
    comment => {

      const key =
        comment.author +
        comment.text;

      if(
        rendered.has(key)
      ) return;

      rendered.add(key);

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "yt-comment";

      const cleanName =
        comment.author
          ?.replace(/^@+/, "")
          ?.trim() || "?";

      const letter =
        cleanName
          .charAt(0)
          .toUpperCase();

      const colors = [

        "#c75b56",
        "#b85c7a",
        "#8d5fa8",
        "#6f63a8",
        "#5667a8",
        "#4d82b8",
        "#3f8d85",
        "#5f9b63",
        "#88a85a",
        "#c28a4d",
        "#c06b4f"

      ];

      const color =
        colors[
          cleanName
            .charCodeAt(0) %
            colors.length
        ];

      const avatarHtml =
        comment.avatar

          ? `
            <img
              class="yt-avatar"
              src="${comment.avatar}"
              referrerpolicy="no-referrer"
              loading="lazy"
              onerror="this.style.display='none'"
            >
          `

          : `
            <div
              class="yt-avatar-fallback"
              style="
                background:${color};
              "
            >

              ${escapeHtml(letter)}

            </div>
          `;

      const repliesId =
        "replies_" +
        Math.random()
          .toString(36)
          .slice(2);

      const hasReplies =
        comment.replies &&
        comment.replies.length;

      const repliesHtml =
        hasReplies

          ? `

            <button
              class="yt-replies-toggle"
              data-target="${repliesId}"
            >

              ▼ Ответы (${comment.replies.length})

            </button>

            <div
              class="yt-replies"
              id="${repliesId}"
            >

              ${comment.replies.map(reply => `

                <div class="yt-reply">

                  ${
                    reply.avatar

                      ? `
                        <img
                          class="yt-avatar yt-reply-avatar"
                          src="${reply.avatar}"
                        >
                      `

                      : `
                        <div class="yt-avatar-fallback yt-reply-avatar">
                          ${escapeHtml(
                            reply.author?.charAt(0) || "?"
                          )}
                        </div>
                      `
                  }

                  <div class="yt-comment-body">

                    <div class="yt-author">
                      ${escapeHtml(reply.author)}
                    </div>

                    <div class="yt-text">
                      ${escapeHtml(reply.text)}
                    </div>

                  </div>

                </div>

              `).join("")}

            </div>

          `

          : "";

      div.innerHTML = `

        ${avatarHtml}

        <div class="yt-comment-body">

          <div class="yt-author">

            ${escapeHtml(
              comment.author
            )}

          </div>

          <div class="yt-text">

            ${escapeHtml(
              comment.text
            )}

          </div>

          ${repliesHtml}

        </div>

      `;

      container.appendChild(
        div
      );

    }
  );

  document
    .querySelectorAll(
      ".yt-replies-toggle"
    )
    .forEach(btn => {

      if(btn.dataset.bound)
        return;

      btn.dataset.bound = "1";

      btn.onclick = () => {

        const target =
          document.getElementById(
            btn.dataset.target
          );

        if(!target)
          return;

        const hidden =
          target.style.display ===
          "none";

        target.style.display =
          hidden
            ? "block"
            : "none";

        btn.innerText =
          hidden

            ? btn.innerText.replace(
                "▶",
                "▼"
              )

            : btn.innerText.replace(
                "▼",
                "▶"
              );

      };

    });

}

function injectStyles(){

  if(
    document.getElementById(
      "ytCustomStyles"
    )
  ) return;

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "ytCustomStyles";

  style.textContent = `

    #ytOverlay{
      position:fixed;
      inset:0;
      z-index:999999999;
      background:rgba(0,0,0,.82);
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:Arial,sans-serif;
    }

    #ytBackdrop{
      position:absolute;
      inset:0;
    }

    #ytModal{
      width:94vw;
      height:90vh;
      background:#181818;
      border-radius:14px;
      overflow:hidden;
      display:flex;
      position:relative;
      z-index:2;
    }

    #ytVideo{
      flex:1;
      background:black;
    }

    #ytVideo iframe{
      width:100%;
      height:100%;
      border:none;
    }

    #ytComments{
      width:360px;
      background:#202020;
      display:flex;
      flex-direction:column;
      border-left:1px solid #333;
    }

    #ytCommentsHeader{
      padding:10px 14px;
      font-size:15px;
      font-weight:700;
      color:white;
      border-bottom:1px solid #333;
    }

    #ytCommentsLoader{
      padding:18px;
      color:#f1f1f1;
      font-size:13px;
      text-align:center;
    }

    #ytDots::after{
      content:"";
      animation:
        ytDots 1.8s infinite;
    }

    @keyframes ytDots{

      0%{
        content:"";
      }

      25%{
        content:".";
      }

      50%{
        content:"..";
      }

      75%{
        content:"...";
      }

      100%{
        content:"";
      }

    }

    #ytCommentsContent{
      flex:1;
      overflow-y:auto;
      padding:6px 9px;
    }

    .yt-comment{
      display:flex;
      gap:9px;
      margin-bottom:14px;
      align-items:flex-start;
    }

    .yt-avatar{
      width:28px;
      height:28px;
      border-radius:50%;
      object-fit:cover;
      flex-shrink:0;
      background:#333;
      margin-top:1px;
    }

    .yt-avatar-fallback{
      width:28px;
      height:28px;
      border-radius:50%;
      color:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:13px;
      font-weight:700;
      flex-shrink:0;
      margin-top:1px;
    }

    .yt-comment-body{
      flex:1;
      min-width:0;
      display:flex;
      flex-direction:column;
      align-items:flex-start;
    }

    .yt-author{
      color:#fff;
      font-size:12px;
      font-weight:700;
      margin-bottom:2px;
    }

    .yt-text{
      color:#e5e5e5;
      font-size:13px;
      line-height:1.38;
      word-break:break-word;
    }

    .yt-replies-toggle{
      margin-top:8px;
      background:none;
      border:none;
      color:#3ea6ff;
      cursor:pointer;
      font-size:12px;
      padding:0;
    }

    .yt-replies{
      margin-top:10px;
      margin-left:12px;
      border-left:1px solid #333;
      padding-left:10px;
    }

    .yt-reply{
      display:flex;
      gap:8px;
      margin-bottom:10px;
    }

    .yt-reply-avatar{
      width:22px;
      height:22px;
      font-size:11px;
    }

    #ytClose{
      position:absolute;
      top:8px;
      right:8px;
      width:30px;
      height:30px;
      border:none;
      border-radius:50%;
      background:rgba(255,255,255,.12);
      color:white;
      font-size:15px;
      cursor:pointer;
      z-index:20;
    }

  `;

  document.head.appendChild(
    style
  );

}

function escapeHtml(str){

  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");

}