
/* ============================================================
   CONTENT —— 所有文字集中在這裡，未來只需要改這裡
   ============================================================ */
const CONTENT = {
  boyfriendName: "晉德",
  boyfriendFull: "晉德大寶貝",
  girlfriendName: "美麗的女友大人",
  qixiDate: "2026.08.19",
  spotifyTrackId: "0yWDm3hpwuIKJMtTKLzvlc",

  timeline: [
    { tag: "13 YEARS AGO", lines: ["高中", "那時候的我們，大概不會想到，這個認識了很久的人，最後會成為現在最熟悉的另一半。"] },
    { tag: "THEN", lines: ["畢業以後，我們曾經差一點走到一起。", "只是那時候的我們，有一些誤會，也有一些還不夠成熟的地方。", "所以故事沒有在那個時候開始。"] },
    { tag: "BUT WE NEVER REALLY LOST TOUCH", lines: ["雖然沒有在一起，但我們一直都有聯繫。", "就這樣一直走著、長大著，也慢慢變成了更成熟的自己。"] },
    { tag: "3+ YEARS AGO", lines: ["後來有一天，我們的關係重新變得明確。", "那時候的我們，生活開始穩定，也更知道自己想要的是什麼。", "於是這一次，我們真的在一起了。"] },
  ],

  quiz: [
    {
      q: "當兩個人想法不一樣的時候？",
      options: [
        { t: "誰比較有道理誰贏", correct:false, fb:"嗯……這個家庭法庭不採用。" },
        { t: "先不講話", correct:false, fb:"冷靜一下可以，但不能直接消失喔。" },
        { t: "各講各的", correct:false, fb:"這樣只是兩個人在開自己的會議。" },
        { t: "站到對方的位置想一下", correct:true, fb:"✅ 正解。雖然實際執行難度 ★★★★☆，但我們目前還算及格。" },
      ],
      badge: "換位思考 ✓"
    },
    {
      q: "當其中一個人情緒不太好的時候？",
      options: [
        { t: "「妳到底怎麼了？」", correct:false, fb:"語氣先收一下，好嗎。" },
        { t: "「好了啦。」", correct:false, fb:"這句的安撫力大概是負分。" },
        { t: "假裝沒看到", correct:false, fb:"這樣情緒只會累積，不會消失。" },
        { t: "先理解，再慢慢說", correct:true, fb:"✅ 答對。畢竟有時候，對方需要的不是解決方案，只是想被理解一下。" },
      ],
      badge: "情緒說開 ✓"
    },
    {
      q: "磨合的最高境界是？",
      options: [
        { t: "把對方改造成跟自己一樣", correct:false, fb:"這不是磨合，這是裝修工程。" },
        { t: "永遠都不生氣", correct:false, fb:"人不是神，偶爾生氣很正常。" },
        { t: "永遠都要自己退讓", correct:false, fb:"這樣久了會委屈，不是長久之計。" },
        { t: "知道彼此不一樣，還是願意互相調整", correct:true, fb:"🎉 完成！這才是能走長久的方式。" },
      ],
      badge: "鬧完還是要抱抱 ✓"
    },
  ],

  ourWayLines: [
    "我們當然不是每一天都完全一樣",
    "有時候會有情緒，有時候會有不同想法，有時候也需要一點時間，才能站到對方的角度去想",
    "但我很喜歡我們現在的方式",
    "有什麼就說　不開心就說　不理解就慢慢講",
    "然後，講完了就抱一下",
    "因為我們不是要分出誰贏誰輸",
    "是希望最後，兩個人都能好好的",
  ],

  dinnerOptions: [
    { id:"izakaya", emoji:"🍶", t:"居酒屋", s:"喝一點、吃一點，慢慢聊。",
      tag:"GOOD CHOICE.", body:"看來今天適合：小酌一下、吃點東西，是你喜歡的日式料理。<br>這個選項我批准。🍶" },
    { id:"ramen", emoji:"🍜", t:"拉麵", s:"快速決定，吃完再說。",
      tag:"SIMPLE & GOOD. 🍜", body:"吃拉麵不用想太多。<br>但吃完之後，回家繼續～" },
    { id:"sukiyaki", emoji:"🥩", t:"壽喜燒", s:"今天就想好好吃一頓。",
      tag:"GOOD CHOICE.", body:"OKAY，今天有認真吃飯。🥩<br>看來今天的你，值得被好好餵飽。" },
    { id:"other", emoji:"🍣", t:"其他", s:"你有更好的提案？",
      tag:"喔？有自己的想法？", body:"可以。請提出你的七夕企劃。<br>（但最終審核權在女朋友手上。）" },
  ],

  activityOptions: [
    { id:"walk", emoji:"🌙", t:"散步消化一下", s:"吃飽了，就一起走走。", tag:"GOOD CHOICE.", body:"吃飽了，就一起走走。" },
    { id:"home", emoji:"🛋️", t:"回家耍廢", s:"今天的行程到此，完美～", tag:"GOOD CHOICE.", body:"今天的行程到此，完美～" },
  ],

  finalLines: [
    "13 年。",
    "從以前，到現在，我們經歷了很多，又重新走回彼此身邊",
    "現在想想，我很喜歡我們現在的樣子",
    "不是每天都一模一樣，而是知道彼此不一樣，卻還是願意理解、磨合，然後繼續一起走",
    "今年的七夕，不用很盛大",
    "小小的一個約會就好，因為我想要的，其實一直都很簡單",
    "__EMPH__有你　有我　❤️",
    "七夕快樂　2026.08.19 見",
  ],
};

/* 照片路徑集中管理 —— 之後只需要換這裡的檔案，不用動版面程式碼 */
const IMAGES = [
  { src:"images/photo01.jpg", title:"以前的我們", caption:"故事開始以前，很久很久以前。", funny:false, orient:"landscape" },
  { src:"images/photo02.jpg", title:"還是朋友", caption:"那時候的我們，還不知道未來會變成什麼樣子。", funny:false, orient:"landscape" },
  { src:"images/photo03.jpg", title:"重新在一起後", caption:"繞了一圈，故事終於重新開始。", funny:false, orient:"portrait" },
  { src:"images/photo04.jpg", title:"身份轉換", caption:"從朋友變成另一半，青澀但很珍貴。", funny:false, orient:"portrait" },
  { src:"images/photo05.jpg", title:"日常生活", caption:"原來最平凡的日子，也能變成回憶。", funny:false, orient:"portrait" },
  { src:"images/photo06.jpg", title:"專屬我們的戒指", caption:"一起親手做的回憶，也一起帶著走。", funny:false, orient:"portrait" },
  { src:"images/photo07.jpg", title:"約會", caption:"把普通的一天，變成特別的一天。", funny:false, orient:"portrait" },
  { src:"images/photo08.jpg", title:"一起吃飯", caption:"人生很多快樂，好像都發生在餐桌上。", funny:false, orient:"portrait" },
  { src:"images/photo09.jpg", title:"調皮搗蛋", caption:"這張照片本人要求撤回。", funny:true, orient:"portrait" },
  { src:"images/photo10.jpg", title:"第一次日本旅行", caption:"第一次一起踏上日本的回憶。", funny:false, orient:"landscape" },
  { src:"images/photo11.jpg", title:"人生大事", caption:"重要的時刻，有你一起面對。", funny:false, orient:"landscape" },
  { src:"images/photo12.jpg", title:"現在的我們", caption:"故事還沒結束，我們現在依然在一起。", funny:false, orient:"landscape" },
];

/* ============================================================
   PHOTO_LAYOUT —— 拍立得照片版面設定（可留空，使用預設散落角度）
   在編輯模式（?edit=1）用「儲存版面」匯出後，把內容貼在這裡取代，
   重新部署到 Netlify 後，所有訪客看到的都會是你調整好的版面
   ============================================================ */
const PHOTO_LAYOUT = {};
