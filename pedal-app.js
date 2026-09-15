const pedal = document.getElementById("demoPedal");
const footswitch = pedal.querySelector(".pedal-footswitch");
const knobs = pedal.querySelectorAll(".pedal-knob");

footswitch.addEventListener("click", () => {
  pedal.classList.toggle("on");
});

knobs.forEach((knob) => {
  let dragging = false;
  let startY = 0;
  let startValue = 0.5;

  knob.addEventListener("mousedown", (e) => {
    dragging = true;
    startY = e.clientY;
    startValue = parseFloat(knob.dataset.value || 0.5);
    document.body.style.cursor = "ns-resize";
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.cursor = "";
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dy = startY - e.clientY;
    let newValue = startValue + dy * 0.01;
    newValue = Math.max(0, Math.min(1, newValue));
    knob.dataset.value = newValue.toFixed(2);
    const angle = -135 + newValue * 270;
    knob.style.transform = `rotate(${angle}deg)`;
  });
});
