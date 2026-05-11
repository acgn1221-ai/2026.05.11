let capture;
let faceMesh;
let faces = [];
let earringImg;

function preload() {
  // 載入 ml5.js 的 faceMesh 模型
  faceMesh = ml5.faceMesh();
  // 載入耳環圖片
  earringImg = loadImage('pic/1.png', 
    () => console.log("耳環圖片載入成功"), 
    (err) => console.error("無法載入圖片 'pic/1.png'，請檢查路徑與伺服器設定", err)
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 取得攝影機影像
  capture = createCapture(VIDEO);
  capture.size(640, 480); // 設定影像解析度以利計算
  // 隱藏原始的 HTML 影片元件，只在畫布上繪製
  capture.hide();

  // 開始持續偵測臉部
  faceMesh.detectStart(capture, gotFaces);
}

function gotFaces(results) {
  faces = results;
}

function draw() {
  background('#e7c6ff');

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

        // 檢查圖片是否載入成功 (若載入失敗 width 通常為 1)
        if (earringImg.width > 1) {
          // 在耳垂位置繪製耳環圖片，寬高為顯示區域寬度的 10%
          image(earringImg, x, y + offsetY, dW * 0.1, dW * 0.1);
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
