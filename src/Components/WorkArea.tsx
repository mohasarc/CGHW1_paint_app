import { Card, CardContent } from '@mui/material';
import { useEffect } from "react";
import * as MV from '../Common/MV';
import * as INIT from '../Common/initShaders';
import * as UTILS from '../Common/webgl-utils';

import { squaremShaders } from '../shaders';
import { StateManager } from "../util/StateManager";
import { addAttribute } from "../util/webglHelpers";
import { Layer } from "../Components/Layers";

export default function WorkArea() {
    useEffect(init);
  
    return (
        <Card>
            <CardContent style={{backgroundColor: '#3b4245'}}>
                <canvas id={'macanvas'} width={'520'} height={'550'} />
            </CardContent>
        </Card>
    );
}

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

  setInterval(()=>{
    console.log('Canvas size: ', canvas.clientWidth, canvas.clientHeight);
  }, 500)

  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  gl.clearColor(0.8, 0.8, 0.8, 1.0);

  //
  //  Load shaders and initialize attribute buffers
  //
  const program = INIT.initShaders(gl, squaremShaders.vertexShader, squaremShaders.fragmentShader);
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);

  const vertexBuffer = gl.createBuffer(); // TODO can be in global state

  if (vertexBuffer)
    addAttribute(gl, program, 'vPosition', vertexBuffer, maxNumVertices, 3, gl.FLOAT);

  const colorBuffer = gl.createBuffer(); // TODO can be in global state
  if (colorBuffer)
    addAttribute(gl, program, 'vColor', colorBuffer, maxNumVertices, 4, gl.FLOAT);

  canvas.addEventListener("mousedown", function (event: any) {
    redraw = true;
  });

  canvas.addEventListener("mouseup", function (event: any) {
    redraw = false;
  });
  //canvas.addEventListener("mousedown", function(){
  canvas.addEventListener("mousemove", function (event: any) {

    if (redraw) {
      const currentLayer = getCurrentLayer();
      if (!currentLayer)
        return;

      let newVertex = MV.vec2((2 * ((event.clientX - canvas.offsetLeft) / canvas.width) - 1),
        2 * ((canvas.height - event.clientY + canvas.offsetTop) / canvas.height) - 1);
      let newColor = MV.vec4(...StateManager.getInstance().getState('picked-color'));
      
      currentLayer.vertexData.unshift(...newVertex);
      currentLayer.colorData.unshift(...newColor);

      index++;
    }
  });

  (function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    
    const layers = StateManager.getInstance().getState('layers');
    let i = 0;
    
    console.log('layers: ', layers);
    if (layers) {
      layers.forEach((layer: Layer, layerIndex: number) => {
        if(!layer.visible)
          return;
  
        const vertices = layer.vertexData;
        const colors = layer.colorData;
        for (let j = 0, k = 0; j < vertices.length; j+=2, k+= 4) {
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 3 * i, MV.flatten([vertices.slice(j, j+2), layerIndex/1000]));
          
          gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(colors.slice(k, k+5)));
          
          i++;
        }
      });
    }
  
    /************ Draw Lines **************/
    gl.useProgram(program);
    gl.drawArrays(gl.POINTS, 0, i);

    requestAnimationFrame(render);
  })();
}

function getCurrentLayer() {
  const currentLayerId = StateManager.getInstance().getState('selectedLayer');
  return StateManager.getInstance().getState('layers').find((layer: Layer) => layer.id === currentLayerId);
}
