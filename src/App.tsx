import "./styles.css";
import { Container, Grid } from "@mui/material";
import { useEffect } from "react";
import * as MV from './Common/MV';
import * as INIT from './Common/initShaders';
import * as UTILS from './Common/webgl-utils';

import { squaremShaders } from './shaders';
import { StateManager } from "./util/StateManager";
import { addAttribute } from "./util/webglHelpers";
import ColorPicker from './Components/ColorPicker';


function init() {
  let canvas: any;
  let gl: WebGLRenderingContext;

  let maxNumVertices = 10000;
  let index = 0;
  let redraw = false;

  canvas = document.getElementById('macanvas');

  if (!canvas)
    throw new Error('Couldn\'t create the canvas');

  gl = UTILS.WebGLUtils.setupWebGL(canvas, null);
  if (!gl) { alert("WebGL isn't available"); }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.8, 0.8, 0.8, 1.0);

  //
  //  Load shaders and initialize attribute buffers
  //
  let program = INIT.initShaders(gl, squaremShaders.vertexShader, squaremShaders.fragmentShader);
  gl.useProgram(program);

  let vertexBuffer = gl.createBuffer(); // TODO can be in global state

  if (vertexBuffer)
    addAttribute(gl, program, 'vPosition', vertexBuffer, maxNumVertices, 2, gl.FLOAT);

  let colorBuffer = gl.createBuffer(); // TODO can be in global state
  if (colorBuffer)
    addAttribute(gl, program, 'vColor', colorBuffer, maxNumVertices, 4, gl.FLOAT);

  StateManager.getInstance().setState('lines', {
    program,
    vertexBuffer,
    colorBuffer,
  });


  canvas.addEventListener("mousedown", function (event: any) {
    redraw = true;
  });

  canvas.addEventListener("mouseup", function (event: any) {
    redraw = false;
  });
  //canvas.addEventListener("mousedown", function(){
  canvas.addEventListener("mousemove", function (event: any) {

    if (redraw) {
      let newVertex = MV.vec2((2 * ((event.clientX - canvas.offsetLeft) / canvas.width) - 1),
        2 * ((canvas.height - event.clientY + canvas.offsetTop) / canvas.height) - 1);
      let newColor = MV.vec4(...StateManager.getInstance().getState('picked-color'));

      gl.bindBuffer(gl.ARRAY_BUFFER, StateManager.getInstance().getState('lines').vertexBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 2 * 4 * index, MV.flatten(newVertex));

      gl.bindBuffer(gl.ARRAY_BUFFER, StateManager.getInstance().getState('lines').colorBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * index, MV.flatten(newColor));

      index++;
    }
  });

  (function render() {

    gl.clear(gl.COLOR_BUFFER_BIT);
    
    /************ Draw Lines **************/
    gl.useProgram(StateManager.getInstance().getState('lines').program);
    gl.drawArrays(gl.POINTS, 0, index);

    requestAnimationFrame(render);
  })();
}

export default function App() {
  // Initial value
  StateManager.getInstance().setState('picked-color', [0, 0, 0, 0]);

  useEffect(init);

  return (
    <div className="App">
      <Container maxWidth="lg" >
        <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>

          <Grid item xs={12} sm={6} md={2}>
            <h2>Painter :D</h2>
          </Grid>

          <Grid item xs={12} sm={6} md={8}>
            <canvas id={'macanvas'} width={512} height={512} />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <ColorPicker></ColorPicker>
          </Grid>

        </Grid>
      </Container>
    </div>
  );
}
