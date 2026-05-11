let capture;
let faceMesh;
let handPose;
let faces = [];
let hands = [];
let earringImages = [];
let maskImg;
let currentEarring;

function preload() {
  // 載入 ml5.js 模型
  faceMesh = ml5.faceMesh();
  handPose = ml5.handPose();

  // 載入 images 目錄下的 1.png 到 5.png
  for (let i = 1; i <= 5; i++) {
    earringImages.push(loadImage(`images/${i}.png`, 
      () => console.log(`圖片 images/${i}.png 載入成功`),
      (err) => console.warn(`無法載入 images/${i}.png`)));
  }

  // 載入面具圖片 (檔案需放置於 face 目錄下)
  maskImg = loadImage('face/f1.png', 
    () => console.log("面具圖片載入成功"), 
    (err) => console.warn("找不到 face/f1.png，請確認目錄與檔名"));
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 取得攝影機影像
  capture = createCapture(VIDEO, (stream) => {
    console.log("攝影機已啟動");
  }, (err) => {
    console.error("攝影機啟動失敗: ", err);
    alert("找不到攝影機！請檢查設備連接或權限設定設定。");
  });
  
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

    // 根據手指數量切換圖片或隱藏
    if (fingersUp >= 1 && fingersUp <= 5) {
      currentEarring = earringImages[fingersUp - 1];
    } else if (fingersUp === 0) {
      // 偵測到握拳 (0 隻手指)，將 currentEarring 設為 null 代表隱藏
      currentEarring = null;
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
  if (capture && capture.width > 0 && faces.length > 0) {
    let face = faces[0];
    
    // 取得左右耳垂點
    let p1 = face.keypoints[132];
    let p2 = face.keypoints[361];

    // 將座標映射到畫布空間，用以計算兩耳之間的顯示距離
    let x1 = map(p1.x, 0, capture.width, -dW / 2, dW / 2);
    let y1 = map(p1.y, 0, capture.height, -dH / 2, dH / 2);
    let x2 = map(p2.x, 0, capture.width, -dW / 2, dW / 2);
    let y2 = map(p2.y, 0, capture.height, -dH / 2, dH / 2);
    
    // 計算臉部寬度（兩耳距離）作為縮放基準
    let faceSize = dist(x1, y1, x2, y2);
    // 動態計算耳環大小（約為臉寬的 20%）與下墜偏移量（約為臉寬的 5%）
    let earringSize = faceSize * 0.2;
    let offsetY = faceSize * 0.05;

    // --- 臉部側轉偵測邏輯 ---
    // 使用鼻尖 (kp 4) 與臉部左右兩側邊界 (kp 234, 454) 的距離比例
    let nose = face.keypoints[4];
    let leftEdge = face.keypoints[234];
    let rightEdge = face.keypoints[454];
    let dLeft = dist(nose.x, nose.y, leftEdge.x, leftEdge.y);
    let dRight = dist(nose.x, nose.y, rightEdge.x, rightEdge.y);
    let turnRatio = dLeft / dRight;

    // 如果比例偏離中心 (代表側轉)，則顯示面具
    if (turnRatio < 0.6 || turnRatio > 1.7) {
      if (maskImg && maskImg.width > 1) {
        let faceCenterX = map(face.keypoints[1].x, 0, capture.width, -dW / 2, dW / 2);
        let faceCenterY = map(face.keypoints[1].y, 0, capture.height, -dH / 2, dH / 2);
        // 面具大小設定為臉部寬度的 1.5 倍，使其覆蓋全臉
        image(maskImg, faceCenterX, faceCenterY, faceSize * 1.5, faceSize * 1.5);
      }
    }

    let earPoints = [p1, p2];
    earPoints.forEach(pt => {
      if (pt) {
        let x = map(pt.x, 0, capture.width, -dW / 2, dW / 2);
        let y = map(pt.y, 0, capture.height, -dH / 2, dH / 2);
        
        // 只有在 currentEarring 不為 null 時才繪製 (null 代表握拳隱藏)
        if (currentEarring !== null) {
          if (currentEarring && currentEarring.width > 1) {
            // 繪製隨臉部遠近縮放的耳環
            image(currentEarring, x, y + offsetY, earringSize, earringSize);
          } else {
            // 備案：如果尚未偵測到手勢 (undefined) 或圖片載入失敗，顯示黃色圓圈
            fill(255, 255, 0);
            noStroke();
            circle(x, y + offsetY, earringSize * 0.3); 
          }
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
