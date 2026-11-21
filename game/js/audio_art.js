// ============================================================================
// Web Audio 合成赛博朋克音效引擎 & Canvas 像素角色肖像渲染器（零外部资源依赖）
// ============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(type) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      if (type === 'click') {
        this._tone(680, 420, 0.05, 'square', 0.06, now);
      } else if (type === 'coin') {
        this._tone(987.77, 987.77, 0.07, 'triangle', 0.12, now);
        this._tone(1318.5, 1318.5, 0.16, 'triangle', 0.12, now + 0.07);
      } else if (type === 'scan') {
        this._tone(320, 1240, 0.22, 'sawtooth', 0.07, now);
        this._tone(1240, 480, 0.18, 'sine', 0.06, now + 0.22);
      } else if (type === 'alert') {
        this._tone(520, 260, 0.14, 'sawtooth', 0.12, now);
        this._tone(520, 260, 0.18, 'sawtooth', 0.12, now + 0.16);
      } else if (type === 'shotgun') {
        // 白噪声爆发 + 低频重击模拟霰弹枪轰鸣
        const bufferSize = this.ctx.sampleRate * 0.28;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.07));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        this._tone(130, 38, 0.25, 'sawtooth', 0.22, now);
      } else if (type === 'craft') {
        this._tone(260, 520, 0.12, 'triangle', 0.09, now);
        this._tone(520, 780, 0.15, 'sine', 0.10, now + 0.11);
      } else if (type === 'door') {
        this._tone(440, 660, 0.09, 'sine', 0.07, now);
        this._tone(660, 550, 0.12, 'sine', 0.06, now + 0.1);
      } else if (type === 'fail') {
        this._tone(300, 170, 0.22, 'sawtooth', 0.10, now);
      }
    } catch (_) {
      // 忽略浏览器自动播放限制异常
    }
  }

  _tone(fStart, fEnd, dur, wave, vol, startTime) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(fStart, startTime);
    if (fStart !== fEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), startTime + dur);
    }
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }
}

export const sfx = new SoundEngine();

// ----------------------------------------------------------------------------
// 赛博朋克像素风顾客肖像生成器
// 根据顾客身份、阵营、是否通缉犯、是否潜伏 AI 改造体（Aug）绘制动态像素画肖像
// ----------------------------------------------------------------------------
export function drawCustomerPortrait(canvas, customer, tick = 0) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.imageSmoothingEnabled = false;

  // 背景：下层空间站霓虹窗景 + 扫描线
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#090d1a');
  grad.addColorStop(0.65, '#111c33');
  grad.addColorStop(1, '#1a1428');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 远处空间站霓虹灯牌装饰
  ctx.fillStyle = 'rgba(6, 182, 212, 0.14)';
  ctx.fillRect(14, 18, 36, 10);
  ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';
  ctx.fillRect(W - 52, 26, 38, 8);

  if (!customer) {
    // 空柜台状态：显示霓虹 OPEN 灯牌
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 48, H / 2 - 20, 96, 40);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WAITING...', W / 2, H / 2 + 5);
    return;
  }

  // 像素网格尺度 (48x48 逻辑像素 -> 放大到画布)
  const px = Math.floor(W / 40);
  const ox = Math.floor((W - px * 40) / 2);
  const oy = Math.floor(H - px * 38);

  // AI 改造体会有微妙的机械抽搐，人类则是自然呼吸起伏
  let bobY = Math.round(Math.sin(tick * 0.07) * 1);
  let glitchX = 0;
  if (customer.isAug && customer.augVisualType === 'twitch') {
    bobY = 0;
    if (tick % 55 < 4) glitchX = (tick % 2 === 0 ? 1 : -1);
  }

  const rect = (gx, gy, gw, gh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + (gx + glitchX) * px, oy + (gy + bobY) * px, gw * px, gh * px);
  };

  // 角色配色
  const seed = customer.seed || 17;
  const skinTones = ['#e0b193', '#c68c68', '#8d5b3e', '#f0c8b0', '#b8866b'];
  const skin = customer.isSecurityRaid ? '#d7a485' : skinTones[seed % skinTones.length];
  const coatHue = customer.isSecurityRaid ? 0 : (customer.coatHue ?? 200);
  const coatMain = customer.isSecurityRaid
    ? '#7f1d1d'
    : `hsl(${coatHue}, 42%, 28%)`;
  const coatLight = customer.isSecurityRaid
    ? '#dc2626'
    : `hsl(${coatHue}, 58%, 44%)`;

  // 肩膀与外套
  rect(7, 25, 26, 13, coatMain);
  rect(10, 24, 20, 3, coatLight);
  // 领口/内衬
  rect(16, 25, 8, 9, '#0f172a');

  // 如果服饰与阵营错位（AI 改造体伪装破绽之一，或上层胸章）
  if (customer.mismatchBadge || customer.faction === 'upper') {
    rect(25, 28, 4, 3, '#f472b6');
    rect(26, 29, 2, 1, '#fde047');
  } else if (customer.isSecurityRaid) {
    // 治安官警徽
    rect(25, 28, 4, 4, '#facc15');
  }

  // 脖颈
  rect(17, 20, 6, 6, skin);
  // 通缉犯条形码刺青
  if (customer.wantedId === 'wanted_viper') {
    rect(18, 22, 4, 2, '#1e293b');
  }

  // 耳朵 & 耳后 AI 神经芯片破绽
  rect(11, 13, 2, 5, skin);
  rect(27, 13, 2, 5, skin);
  if (customer.isAug && customer.augVisualType === 'chip') {
    // 耳后闪烁红光的失控 AI 芯片
    const blink = (Math.floor(tick / 12) % 2 === 0) ? '#ff1e56' : '#7f1d1d';
    rect(27, 15, 2, 2, '#334155');
    rect(28, 15, 1, 1, blink);
  }

  // 头部轮廓
  rect(13, 7, 14, 15, skin);
  rect(14, 6, 12, 2, skin);

  // 脸部疤痕（通缉犯幽灵焊工）
  if (customer.wantedId === 'wanted_ghost') {
    rect(14, 15, 3, 4, '#991b1b');
  }

  // 眼睛与瞳孔（普通人会眨眼，AI 改造体六边形异色瞳且不眨眼）
  const isBlinking = !customer.isAug && (tick % 95 < 4);
  if (isBlinking) {
    rect(15, 13, 3, 1, '#1e293b');
    rect(22, 13, 3, 1, '#1e293b');
  } else {
    rect(15, 12, 3, 2, '#f8fafc');
    rect(22, 12, 3, 2, '#f8fafc');
    if (customer.isAug && customer.augVisualType === 'pupil') {
      // 诡异青红色非人瞳孔
      rect(16, 12, 2, 2, '#00f5d4');
      rect(23, 12, 2, 2, '#f43f5e');
    } else {
      rect(16, 12, 2, 2, '#0f172a');
      rect(23, 12, 2, 2, '#0f172a');
    }
  }

  // 独眼通缉犯眼罩
  if (customer.wantedId === 'wanted_viper') {
    rect(14, 11, 5, 3, '#111827');
    rect(15, 12, 2, 2, '#ef4444');
    rect(13, 11, 14, 1, '#111827');
  }

  // 眉毛与嘴巴表情
  rect(15, 10, 3, 1, '#27272a');
  rect(22, 10, 3, 1, '#27272a');
  if (customer.isAug && customer.augVisualType === 'smile') {
    // 诡异僵硬对称假笑
    rect(16, 18, 8, 1, '#f8fafc');
    rect(15, 17, 1, 1, '#7f1d1d');
    rect(24, 17, 1, 1, '#7f1d1d');
  } else {
    rect(18, 18, 4, 1, '#573b2c');
    if (customer.wantedId === 'wanted_crow') {
      // 银色金属牙签
      rect(21, 18, 4, 1, '#e2e8f0');
    }
  }

  // 头饰 / 发型
  const hairColors = ['#18181b', '#3f271d', '#7c2d12', '#cbd5e1', '#0e7490', '#701a75'];
  const hair = hairColors[(seed >> 1) % hairColors.length];
  if (customer.isSecurityRaid) {
    // 治安局战术头盔与防暴目镜
    rect(12, 4, 16, 5, '#1e293b');
    rect(13, 6, 14, 2, '#ef4444');
    rect(14, 11, 12, 3, '#38bdf8');
  } else if (customer.helmet === 'miner_cap') {
    rect(12, 4, 16, 4, '#ca8a04');
    rect(18, 5, 4, 2, '#fef08a'); // 矿灯
  } else if (customer.helmet === 'goggles' || customer.wantedId === 'wanted_ghost') {
    rect(13, 5, 14, 3, hair);
    rect(13, 8, 14, 3, '#b45309');
    rect(15, 8, 4, 2, '#38bdf8');
    rect(21, 8, 4, 2, '#38bdf8');
  } else if (customer.helmet === 'hood' || customer.wantedId === 'wanted_crow') {
    rect(11, 4, 18, 6, '#3b0764');
    rect(11, 9, 2, 12, '#3b0764');
    rect(27, 9, 2, 12, '#3b0764');
  } else if (customer.helmet === 'visor_gold') {
    rect(13, 4, 14, 4, '#f8fafc');
    rect(14, 11, 12, 2, '#facc15');
  } else {
    rect(12, 4, 16, 4, hair);
    rect(12, 7, 2, 5, hair);
    rect(26, 7, 2, 5, hair);
  }

  // 柜台金属台面遮挡底部
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, H - 10, W, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, H - 10, W, 2);

  // CRT 扫描线滤镜质感
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
}
