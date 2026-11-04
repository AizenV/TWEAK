// Zeichnet das Fadenkreuz (Overlay-Fenster und Vorschau teilen sich diese Funktion). c = Konfiguration.
function drawCrosshair(x,w,h,c){
  x.clearRect(0,0,w,h);x.globalAlpha=Math.min(1,Math.max(.2,(c.opacity==null?100:c.opacity)/100));
  const cx=w/2+(c.ox||0),cy=h/2+(c.oy||0),r=c.size/2,gap=c.gap==null?4:c.gap,t=c.thick||2,out=c.outline!==false,col=c.color;
  const stroke=(f)=>{x.lineCap='butt';if(out){x.strokeStyle='rgba(0,0,0,.7)';x.lineWidth=t+2;f();x.stroke()}x.strokeStyle=col;x.lineWidth=t;f();x.stroke()};
  const lines=(top)=>stroke(()=>{x.beginPath();x.moveTo(cx-r,cy);x.lineTo(cx-gap,cy);x.moveTo(cx+gap,cy);x.lineTo(cx+r,cy);
    if(top){x.moveTo(cx,cy-r);x.lineTo(cx,cy-gap)}x.moveTo(cx,cy+gap);x.lineTo(cx,cy+r)});
  const dot=(rad)=>{if(out){x.beginPath();x.arc(cx,cy,rad+1,0,7);x.fillStyle='rgba(0,0,0,.7)';x.fill()}x.beginPath();x.arc(cx,cy,rad,0,7);x.fillStyle=col;x.fill()};
  const s=c.shape,ds=c.dotSize||3;
  if(s==='cross'||s==='crossdot')lines(true);else if(s==='t')lines(false);
  else if(s==='circle')stroke(()=>{x.beginPath();x.arc(cx,cy,r,0,7)});
  if(s==='dot')dot(Math.max(ds,c.size/8));else if(s==='crossdot'||c.dot)dot(ds);
  x.globalAlpha=1;
}
