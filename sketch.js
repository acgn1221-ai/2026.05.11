let capture;
let faceMesh;
let handPose;
let faces = [];
let hands = [];
let earringImages = [];
let currentEarring;

function preload() {
  // 載入 ml5.js 模型
  faceMesh = ml5.faceMesh();
  handPose = ml5.handPose();

  // 載入手勢 1-5 對應的耳環圖片 (檔案需放置於 pic 目錄下)
  for (let i = 1; i <= 5; i++) {
    earringImages.push(loadImage(`pic/acc${i}_ring.png`));
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 取得攝影機影像
  capture = createCapture(VIDEO);
  capture.size(640, 480); // 設定影像解析度以利計算
  // 隱藏原始的 HTML 影片元件，只在畫布上繪製
  capture.hide();

  // 開始持續偵測臉部與手勢
  faceMesh.detectStart(capture, gotFaces);
  handPose.detectStart(capture, gotHands);
}

function gotFaces(results) {
  faces = results;
}

function gotHands(results) {
  hands = results;
}

function draw() {
  background('#e7c6ff');

  // 手勢辨識計數邏輯
  if (hands.length > 0) {
    let hand = hands[0];
    let fingersUp = 0;

    // 檢測四指 (食指、中指、無名指、小指)
    // 若指尖 (tip) 的 Y 座標小於中間關節 (pip) 的 Y 座標，視為伸出
    if (hand.keypoints[8].y < hand.keypoints[6].y) fingersUp++;
    if (hand.keypoints[12].y < hand.keypoints[10].y) fingersUp++;
    if (hand.keypoints[16].y < hand.keypoints[14].y) fingersUp++;
    if (hand.keypoints[20].y < hand.keypoints[18].y) fingersUp++;

    // 大拇指檢測：判斷指尖與小指根部的距離是否大於關節到小指根部的距離
    let thumbTip = hand.keypoints[4];
    let thumbJoint = hand.keypoints[2];
    let pinkyBase = hand.keypoints[17];
    if (dist(thumbTip.x, thumbTip.y, pinkyBase.x, pinkyBase.y) > 
        dist(thumbJoint.x, thumbJoint.y, pinkyBase.x, pinkyBase.y)) {
      fingersUp++;
    }

    // 根據手指數量 (1-5) 切換對應的耳環圖片
    if (fingersUp >= 1 && fingersUp <= 5) {
      currentEarring = earringImages[fingersUp - 1];
    }
  }

  let dW = width * 0.5;
  let dH = height * 0.5;

  push();
  // 將座標系移至畫面中心
  translate(width / 2, height / 2);
  // 水平翻轉（鏡像）
  scale(-1, 1);
  imageMode(CENTER);
  // 繪製影像，大小為全螢幕寬高各 50%
  image(capture, 0, 0, dW, dH);

  // 如果偵測到臉部，且影像寬度已載入
  if (capture.width > 0 && faces.length > 0) {
    let face = faces[0];
    
    // FaceMesh 關鍵點索引：132 與 361 通常對應於左右耳垂附近的位置
    let earPoints = [face.keypoints[132], face.keypoints[361]];

    earPoints.forEach(pt => {
      if (pt) {
        // 將攝影機原始座標 (640x480) 映射到畫布上縮放後的顯示區域 (-dW/2 到 dW/2)
        let x = map(pt.x, 0, capture.width, -dW / 2, dW / 2);
        let y = map(pt.y, 0, capture.height, -dH / 2, dH / 2);
        
        // 稍微增加一點 Y 軸偏移 (dH * 0.03)，讓耳環看起來是掛在耳垂下方而非正中心
        let offsetY = dH * 0.03;

        // 檢查是否有手勢產生的耳環圖片
        if (currentEarring && currentEarring.width > 1) {
          // 繪製手勢對應的耳環
          image(currentEarring, x, y + offsetY, dW * 0.1, dW * 0.1);
        } else {
          // 備案：如果圖片載入失敗，顯示黃色圓圈，方便確認辨識位置
          fill(255, 255, 0);
          noStroke();
          circle(x, y + offsetY, 15);
        }
      }
    });
  }
  pop();
}

function windowResized() {
  // 當視窗大小改變時，重新調整畫布尺寸
  resizeCanvas(windowWidth, windowHeight);
}
