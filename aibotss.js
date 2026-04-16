class Bot {
    constructor(team) {
        this.team = team;
        this.spawn();
    }

    spawn() {
        this.x = Math.random() * 4000 + 500;
        this.y = (this.team === 't') ? 400 : 3600;
        this.hp = 100;
        this.angle = 0;
        this.lastShot = 0;
        this.dead = false;
        this.radius = 50;
    }

    update(player, allBots, bullets, walls) {
        if (this.dead) return;
        if (this.hp <= 0) {
            this.dead = true;
            setTimeout(() => { this.spawn(); }, 5000);
            return;
        }

        let targets = (this.team === 't') ? [player, ...allBots.filter(b => b.team === 'ct' && !b.dead)] : allBots.filter(b => b.team === 't' && !b.dead);
        let enemy = targets.sort((a,b) => Math.hypot(a.x-this.x, a.y-this.y) - Math.hypot(b.x-this.x, b.y-this.y))[0];

        if (enemy) {
            this.angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
            let dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            
            if (dist > 400) {
                let speed = 3.5;
                let vx = Math.cos(this.angle) * speed;
                let vy = Math.sin(this.angle) * speed;

                // Проверка стен с запасом
                let canMoveX = !walls.some(w => this.x+vx > w.x-55 && this.x+vx < w.x+w.w+55 && this.y > w.y-55 && this.y < w.y+w.h+55);
                let canMoveY = !walls.some(w => this.x > w.x-55 && this.x < w.x+w.w+55 && this.y+vy > w.y-55 && this.y+vy < w.y+w.h+55);

                if (canMoveX) this.x += vx;
                if (canMoveY) this.y += vy;
                
                // Если застрял - выталкиваем
                if(!canMoveX && !canMoveY) {
                    this.x -= Math.cos(this.angle) * 2;
                    this.y -= Math.sin(this.angle) * 2;
                }
            }

            if (dist < 1000 && Date.now() - this.lastShot > 2500) {
                bullets.push({x: this.x, y: this.y, a: this.angle, s: 22, team: this.team, dmg: 15, c: 'white'});
                this.lastShot = Date.now();
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = (this.team === 'ct') ? '#3498db' : '#e74c3c';
        ctx.fillRect(-45, -45, 90, 90);
        // Полоска здоровья
        ctx.fillStyle = 'red'; ctx.fillRect(-45, -60, 90, 10);
        ctx.fillStyle = 'lime'; ctx.fillRect(-45, -60, 90 * (this.hp/100), 10);
        ctx.restore();
    }
}
