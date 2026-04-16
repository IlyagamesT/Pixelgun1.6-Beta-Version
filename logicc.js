// --- ГЛОБАЛЬНЫЙ ИНТЕРФЕЙС ---
window.showUI = (id) => {
    document.querySelectorAll('.cs-panel').forEach(p => p.style.display = 'none');
    const el = document.getElementById(id);
    if(el) el.style.display = 'block';
};

window.selectWeapon = (gun) => {
    player.weapon = gun;
    player.ammo = (gun === 'awp') ? 10 : (gun === 'shotgun' ? 8 : 30);
    player.maxAmmo = player.ammo;
    document.getElementById('menu').style.display = 'none';
    startGame(); 
};

// --- КОНСТАНТЫ И ИГРОК ---
const player = { x: 2500, y: 3500, hp: 100, weapon: 'pistol', ammo: 30, maxAmmo: 30, angle: 0, radius: 40, speed: 7 };
const walls = [
    {x: 0, y: 0, w: 5000, h: 100}, {x: 0, y: 3900, w: 5000, h: 100}, 
    {x: 0, y: 0, w: 100, h: 4000}, {x: 4900, y: 0, w: 100, h: 4000},
    {x: 800, y: 1000, w: 450, h: 2000}, {x: 3750, y: 1000, w: 450, h: 2000}, 
    {x: 1800, y: 1800, w: 1400, h: 450}  
];

let bots = [], bullets = [], gameActive = false, lastShot = 0;
const joyL = { active: false, sx: 0, sy: 0, cx: 0, cy: 0 };
const joyR = { active: false, sx: 0, sy: 0, cx: 0, cy: 0 };

window.onload = () => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    document.getElementById('startClassicBtn').onclick = () => window.showUI('shop-ui');

    window.startGame = () => {
        gameActive = true;
        bots = [new Bot('t'), new Bot('t'), new Bot('t'), new Bot('ct')];
        requestAnimationFrame(gameLoop);
    };

    // --- УПРАВЛЕНИЕ ---
    canvas.addEventListener('touchstart', e => {
        for(let t of e.changedTouches) {
            if(t.clientX < canvas.width/2) { joyL.active=true; joyL.sx=joyL.cx=t.clientX; joyL.sy=joyL.cy=t.clientY; }
            else { joyR.active=true; joyR.sx=joyR.cx=t.clientX; joyR.sy=joyR.cy=t.clientY; }
        }
    });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        for(let t of e.changedTouches) {
            if(t.clientX < canvas.width/2) { joyL.cx=t.clientX; joyL.cy=t.clientY; }
            else { 
                joyR.cx=t.clientX; joyR.cy=t.clientY; 
                player.angle = Math.atan2(joyR.cy - joyR.sy, joyR.cx - joyR.sx);
                fire();
            }
        }
    }, {passive: false});

    canvas.addEventListener('touchend', () => { joyL.active = joyR.active = false; });

    function fire() {
        let now = Date.now();
        let delay = (player.weapon === 'awp') ? 1500 : (player.weapon === 'shotgun' ? 800 : 150);
        
        if(now - lastShot > delay && player.ammo > 0) {
            if(player.weapon === 'shotgun') {
                // Дробовик: 5 пуль веером
                for(let i = -2; i <= 2; i++) {
                    bullets.push({x: player.x, y: player.y, a: player.angle + i*0.15, s: 35, team: 'ct', dmg: 20});
                }
            } else {
                bullets.push({x: player.x, y: player.y, a: player.angle, s: 45, team: 'ct', dmg: (player.weapon === 'awp' ? 100 : 25)});
            }
            player.ammo--;
            lastShot = now;
            if(player.ammo <= 0) setTimeout(() => player.ammo = player.maxAmmo, 1500);
        }
    }

    function gameLoop() {
        if(!gameActive) return;

        // Фикс Флеша (Нормализация скорости)
        if(joyL.active) {
            let dx = joyL.cx - joyL.sx;
            let dy = joyL.cy - joyL.sy;
            let dist = Math.hypot(dx, dy);
            if(dist > 5) {
                let moveX = (dx / dist) * player.speed;
                let moveY = (dy / dist) * player.speed;
                
                if(!checkWall(player.x + moveX, player.y)) player.x += moveX;
                if(!checkWall(player.x, player.y + moveY)) player.y += moveY;
            }
        }

        ctx.fillStyle = '#dbceac'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.scale(0.4, 0.4);
        ctx.translate(-player.x, -player.y);

        ctx.fillStyle = '#7f8c8d'; walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

        // Пули с проверкой попадания
        for(let i = bullets.length-1; i >= 0; i--) {
            let b = bullets[i];
            b.x += Math.cos(b.a) * b.s; 
            b.y += Math.sin(b.a) * b.s;
            
            ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, 7); ctx.fill();

            // Попадание в стены
            if(checkWallSimple(b.x, b.y)) { bullets.splice(i, 1); continue; }

            // Попадание в ботов
            let hitAny = false;
            bots.forEach(bot => {
                if(!bot.dead && b.team !== bot.team && Math.hypot(b.x - bot.x, b.y - bot.y) < 60) {
                    bot.hp -= b.dmg;
                    hitAny = true;
                }
            });
            if(hitAny) { bullets.splice(i, 1); continue; }

            // Попадание в игрока
            if(b.team === 't' && Math.hypot(b.x - player.x, b.y - player.y) < 50) {
                player.hp -= 5;
                bullets.splice(i, 1);
            }
        }

        bots.forEach(bot => { bot.update(player, bots, bullets, walls); bot.draw(ctx); });

        ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
        ctx.fillStyle = '#3498db'; ctx.fillRect(-50, -50, 100, 100); ctx.restore();
        ctx.restore();

        ctx.fillStyle = "black"; ctx.font = "bold 24px Arial";
        ctx.fillText(`HP: ${Math.ceil(player.hp)} | AMMO: ${player.ammo} | WEAPON: ${player.weapon.toUpperCase()}`, 20, canvas.height - 30);
        requestAnimationFrame(gameLoop);
    }

    function checkWall(nx, ny) {
        return walls.some(w => nx > w.x-45 && nx < w.x+w.w+45 && ny > w.y-45 && ny < w.y+w.h+45);
    }
    function checkWallSimple(nx, ny) {
        return walls.some(w => nx > w.x && nx < w.x+w.w && ny > w.y && ny < w.y+w.h);
    }
};
