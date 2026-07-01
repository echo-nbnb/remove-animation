# ReMove V2 Particle Furniture

This version tests a seven-act Three.js furniture scene with particle assembly, white character models, and transparent MOV overlays.

Run:

```powershell
python .\dev_server.py
```

Open the printed local URL, usually:

```txt
http://127.0.0.1:8010
```

Controls:

```txt
Act buttons switch the scene act
Number keys 1-7 switch the scene act
Space  play or pause
```

The bottom row switches between `PIC/ACT1.png` through `PIC/ACT7.png`. Act 2 plays `ved/push.mov` as a transparent overlay. Furniture files assemble as 30,000-particle clouds. `floor.glb` and `door.glb` stay visible as static gray/brown color-block geometry.
