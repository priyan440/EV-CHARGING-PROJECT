import React, { useEffect, useRef } from 'react';

const AnimatedBG = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    class EnergyParticle {
      constructor(w, h) {
        this.reset(w, h);
      }

      reset(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 1.0 - 0.3;
        this.radius = Math.random() * 2.5 + 0.8;
        this.color = Math.random() > 0.5 ? 'rgba(37, 99, 235, 0.25)' : 'rgba(14, 165, 233, 0.25)';
        this.life = Math.random() * 120 + 80;
        this.maxLife = this.life;
      }

      update(w, h) {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        if (this.life <= 0 || this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
          this.reset(w, h);
        }
      }

      draw(c) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.fill();
      }
    }

    const particles = Array.from({ length: 50 }, () => new EnergyParticle(canvas.width, canvas.height));

    const animate = () => {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle Blue Grid
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      particles.forEach((p) => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none bg-[#F8FAFC]"
    />
  );
};

export default AnimatedBG;
