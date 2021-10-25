import { Card, CardContent } from '@mui/material';
import { useEffect, useState } from "react";
import * as MV from '../Common/MV';
import * as INIT from '../Common/initShaders';
import * as UTILS from '../Common/webgl-utils';

import { brushShaders } from '../shaders';
import { StateManager } from "../util/StateManager";
import { addAttribute } from "../util/webglHelpers";
import { Layer } from "./Layers";

const newRectSize = {w: 0, h: 0};
function SelectionRect() {
    const [selectionRectWidth, setSelectionRectWidth] = useState(10);
    const [selectionRectHeight, setSelectionRectHeight] = useState(10);
    const [selectionRectX, setSelectionRectX] = useState(500);
    const [selectionRectY, setSelectionRectY] = useState(500);

    StateManager.getInstance().subscribe('selection-rect-pos', () => {
      handlePropChange();
    });

    StateManager.getInstance().subscribe('selection-rect-size', () => {
      handlePropChange();
    });
    
    function handlePropChange() {
      const newRectSize = StateManager.getInstance().getState('selection-rect-size');
      const newRectPos = StateManager.getInstance().getState('selection-rect-pos');
      
      if (newRectSize && newRectSize.w < 0 && newRectSize.h < 0) {
        setSelectionRectX(newRectPos.x + newRectSize.w);
        setSelectionRectY(newRectPos.y + newRectSize.h);
      } else if (newRectSize && newRectSize.w < 0) {
        setSelectionRectX(newRectPos.x + newRectSize.w);
        setSelectionRectY(newRectPos.y);
      } else if (newRectSize && newRectSize.h < 0) {
        setSelectionRectX(newRectPos.x);
        setSelectionRectY(newRectPos.y + newRectSize.h);
      } else {
        setSelectionRectX(newRectPos.x);
        setSelectionRectY(newRectPos.y);
      }

      if (newRectSize) {
        setSelectionRectHeight(Math.abs(newRectSize.h));
        setSelectionRectWidth(Math.abs(newRectSize.w));
      }
    }

    return <svg id={'selection-rect'} height={selectionRectHeight} width={selectionRectWidth} style={{position: 'absolute', top: selectionRectY, left: selectionRectX}}>
        <rect x="1" y="1" height={selectionRectHeight-2} width={selectionRectWidth-2} style={{stroke: '#000000', strokeWidth: '1', strokeDasharray: '2 2', fill: 'none'}}/>
    </svg>;
}

export default function PaintArea() {
    useEffect(init);
  
    return (
        <Card>
            <CardContent style={{backgroundColor: '#3b4245'}}>
                <canvas id={'macanvas'} width={'520'} height={'550'} />
                <SelectionRect />
            </CardContent>
        </Card>
    );
}

function init() {
  let canvas: any;
  let gl: WebGLRenderingContext;

  let maxNumVertices = 100000;
  let index = 0;
  let redraw = false;
  let newLine = true;
  let selectionRectStartCoords = {x: 0, y: 0};
  let selectionRectEndCoords = {x: 0, y: 0};
  const selectionRectTopLeft = {x: 0, y: 0};
  const selectionRectBotRight = {x: 0, y: 0};
  let selectionInProgress = false;
  const selectionRectElement = document.getElementById('selection-rect');

  canvas = document.getElementById('macanvas');

  if (!canvas || !selectionRectElement)
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
  const program = INIT.initShaders(gl, brushShaders.vertexShader, brushShaders.fragmentShader);
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);

  const vertexBuffer = gl.createBuffer(); // TODO can be in global state
  if (vertexBuffer)
    addAttribute(gl, program, 'vPosition', vertexBuffer, maxNumVertices, 3, gl.FLOAT);

  const brushSizeBuffer = gl.createBuffer(); // TODO can be in global state
  if (brushSizeBuffer)
    addAttribute(gl, program, 'vBrushSize', brushSizeBuffer, maxNumVertices, 1, gl.FLOAT);
    
  const bindingRectBuffer = gl.createBuffer(); // TODO can be in global state
  if (bindingRectBuffer)
    addAttribute(gl, program, 'vBindingRect', bindingRectBuffer, maxNumVertices, 4, gl.FLOAT);

  const colorBuffer = gl.createBuffer(); // TODO can be in global state
  if (colorBuffer)
    addAttribute(gl, program, 'vColor', colorBuffer, maxNumVertices, 4, gl.FLOAT);

  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mousemove", handleMouseMove);
  selectionRectElement.addEventListener("mousedown", handleMouseDown);
  selectionRectElement.addEventListener("mouseup", handleMouseUp);
  selectionRectElement.addEventListener("mousemove", handleMouseMove);
  
  function handleMouseUp(event: any) {
    redraw = false;
    if (StateManager.getInstance().getState('selected-tool') === 'crop') {
      if (!selectionInProgress) {
        copySelectedRegion();
        selectionInProgress = true;
      }
    }
  }

  function handleMouseDown(event: any) {
    const usedTool = StateManager.getInstance().getState('selected-tool');
    redraw = true;
    newLine = true;
    if (usedTool === 'crop') { 
      selectionRectStartCoords = {x: event.clientX - canvas.offsetLeft, y: canvas.height - (event.clientY - canvas.offsetTop)};
      if (!selectionInProgress) {
        StateManager.getInstance().setState('selection-rect-pos', {x: event.clientX, y: event.clientY});
      }
    }
  }

  function handleMouseMove(event: any) {
    if (redraw) {
      const usedTool = StateManager.getInstance().getState('selected-tool');
      if (usedTool === 'brush') {
        freeDraw(event);
      } else if (usedTool === 'eraser') {

      } else if (usedTool === 'crop') {
        selectionRectEndCoords = {x: event.clientX - canvas.offsetLeft, y: canvas.height - (event.clientY - canvas.offsetTop)};
        if (selectionInProgress) {
          moveCopiedRegion({x: event.movementX, y: -event.movementY});
        } else {
          const selectionRectPos1 = StateManager.getInstance().getState('selection-rect-pos');
          const selectionRectPos2 = {x: event.clientX, y: event.clientY};
          // const selectionRectTopLeft = {
          //   x: selectionRectPos1.x<selectionRectPos2.x?selectionRectPos1.x:selectionRectPos2.x,
          //   y: selectionRectPos1.y<selectionRectPos2.y?selectionRectPos1.y:selectionRectPos2.y,
          // };
          // const selectionRectBottomRight = {
          //   x: selectionRectPos1.x>selectionRectPos2.x?selectionRectPos1.x:selectionRectPos2.x,
          //   y: selectionRectPos1.y>selectionRectPos2.y?selectionRectPos1.y:selectionRectPos2.y,
          // };

          // StateManager.getInstance().setState('selection-rect-pos', selectionRectTopLeft);
          StateManager.getInstance().setState('selection-rect-size', {
            w: selectionRectPos2.x - selectionRectPos1.x,
            h: selectionRectPos2.y - selectionRectPos1.y
          });
        }
      } else if (usedTool === 'rect') {

      } else if (usedTool === 'circle') {

      } else if (usedTool === 'triangle') {

      }

    }

    function freeDraw(event: any) {
      const currentLayer = getCurrentLayer();
      if (!currentLayer)
        return;

      let newVertex = MV.vec2((2 * ((event.clientX - canvas.offsetLeft) / canvas.width) - 1),
        2 * ((canvas.height - event.clientY + canvas.offsetTop) / canvas.height) - 1);
      const newColor = MV.vec4(...StateManager.getInstance().getState('picked-color'));
      const brushSize = StateManager.getInstance().getState('brush-size');
      const bindingRect = [0, 0, canvas.width, canvas.height];
      let allPoints: number[][] = [newVertex];
      
      if (!newLine) {
          let lastVertex = MV.vec2(currentLayer.vertexData[0], currentLayer.vertexData[1]);
          addMidPoint(newVertex, lastVertex, allPoints);
        } else {
            newLine = false;
        }
      
        allPoints.forEach((point) => {
            currentLayer.vertexData.unshift(...point);
            currentLayer.colorData.unshift(...newColor);
            currentLayer.boundingRectData.unshift(...bindingRect);
            currentLayer.brushSizeData.unshift(brushSize);
        })

      index++;
    }
    
    function addMidPoint(a: number[], b: number[], allPoints: number[][]) {
        const MAX_ALLOWD_DISTANCE_BTWN_PTS = 0.01;
        const distance = findLinearDistance(a, b);
        console.log('Found distance: ', distance)
        console.log('MAX ALLOWD DISTANCE: ', MAX_ALLOWD_DISTANCE_BTWN_PTS)
        console.log('distance > MAX_ALLOWD_DISTANCE_BTWN_PTS evaluats to: ', distance > MAX_ALLOWD_DISTANCE_BTWN_PTS)
        if (distance > MAX_ALLOWD_DISTANCE_BTWN_PTS) {
            console.log('Will find mid point' )
            const c = findMidPoint(a, b);
            console.log('adding midPoint at: ', c);
            allPoints.unshift(c);
            addMidPoint(a, c, allPoints);
            addMidPoint(c, b, allPoints);
        }
    }

    function findMidPoint(a: number[], b: number[]) {
        return MV.vec2((a[0] + b[0])/2, (a[1] + b[1])/2);
    }

    function findLinearDistance(a: number[], b: number[]) {
        const dx = Math.abs(a[0] - b[0]);
        const dy = Math.abs(a[1] - b[1]);
        return Math.sqrt(dx*dx+dy*dy);
    }
  }

  document.addEventListener('keyup', (event: any) => {
    var name = event.key;
    var code = event.code;

    if (code === 'Escape') {
      if (selectionInProgress) {
        selectionInProgress = false;
        confirmCopy();
      }
    }
  });
  
  function copySelectedRegion() {
    // go over the vertices of the current layer
    const currentLayer = getCurrentLayer();
    if (!currentLayer)
      return;


    if (selectionRectStartCoords.x < selectionRectEndCoords.x) {
      selectionRectTopLeft.x = selectionRectStartCoords.x;
      selectionRectBotRight.x = selectionRectEndCoords.x;
    } else {
      selectionRectTopLeft.x = selectionRectEndCoords.x;
      selectionRectBotRight.x = selectionRectStartCoords.x;
    }

    if (selectionRectStartCoords.y > selectionRectEndCoords.y) {
      selectionRectTopLeft.y = selectionRectStartCoords.y;
      selectionRectBotRight.y = selectionRectEndCoords.y;
    } else {
      selectionRectTopLeft.y = selectionRectEndCoords.y;
      selectionRectBotRight.y = selectionRectStartCoords.y;
    }
    
    // find the ones that fall in the rectangle starting at 
    // selectRectStartCoord and ending at this point

    const numVertex = currentLayer.vertexData.length
    for (let j = numVertex - 2, k = numVertex*2 - 4, l = numVertex/2 - 1; j >= 0; j-=2, k-=4, l-=1 ) {
      const point = MV.vec2(currentLayer.vertexData[j], currentLayer.vertexData[j+1]);
      if ( // point in bounding rectangle
        point[0] > ((selectionRectTopLeft.x/canvas.width)*2)-1
        && point[0] < ((selectionRectBotRight.x/canvas.width)*2)-1
        && point[1] > ((selectionRectBotRight.y/canvas.height)*2)-1
        && point[1] < ((selectionRectTopLeft.y/canvas.height)*2)-1
      ) {
        console.log('found', point)
        // Add these points to a temporary array of copied vertices
        currentLayer.selectedVertices.vertexData.unshift(currentLayer.vertexData[j+1]);
        currentLayer.selectedVertices.vertexData.unshift(currentLayer.vertexData[j]);
        currentLayer.selectedVertices.colorData.unshift(...currentLayer.colorData.slice(k, k+4));
        currentLayer.selectedVertices.brushSizeData.unshift(currentLayer.brushSizeData[l]);

        const existingBoundingRect = { 
          x1: currentLayer.boundingRectData[k], // BotLeft
          y1: currentLayer.boundingRectData[k+1],
          x2: currentLayer.boundingRectData[k] + currentLayer.boundingRectData[k+2], // TopRight
          y2: currentLayer.boundingRectData[k+1] + currentLayer.boundingRectData[k+3],
        }

        const selectionRect = {
          x1: selectionRectTopLeft.x,
          y1: selectionRectBotRight.y,
          x2: selectionRectTopLeft.x + (selectionRectBotRight.x - selectionRectTopLeft.x),
          y2: selectionRectBotRight.y + (selectionRectTopLeft.y - selectionRectBotRight.y),
        }

        let mostRightX1 = selectionRect.x1>existingBoundingRect.x1?selectionRect.x1:existingBoundingRect.x1;
        let mostTopY1 = selectionRect.y1>existingBoundingRect.y1?selectionRect.y1:existingBoundingRect.y1;
        let mostLeftX2 = selectionRect.x2<existingBoundingRect.x2?selectionRect.x2:existingBoundingRect.x2;
        let mostBottomY2 = selectionRect.y2<existingBoundingRect.y2?selectionRect.y2:existingBoundingRect.y2;
        
        currentLayer.selectedVertices.boundingRectData.unshift(...[
          mostRightX1,
          mostTopY1,
          Math.abs(mostLeftX2 - mostRightX1),
          Math.abs(mostBottomY2 - mostTopY1),
        ]);
      }
    }
  }

  function moveCopiedRegion(delta: {x: number, y: number}) {
    // go over the vertices of the current layer
    const currentLayer = getCurrentLayer();
    if (!currentLayer)
      return;

    for (let j = 0, k = 0; j < currentLayer.selectedVertices.vertexData.length; j+=2, k+=4) {
      currentLayer.selectedVertices.vertexData[j] += delta.x/canvas.width*2;
      currentLayer.selectedVertices.vertexData[j+1] += delta.y/canvas.height*2;
      currentLayer.selectedVertices.boundingRectData[k] += delta.x;
      currentLayer.selectedVertices.boundingRectData[k+1] += delta.y;
    }
    
    const selectionRectPos = StateManager.getInstance().getState('selection-rect-pos');
    StateManager.getInstance().setState('selection-rect-pos', {x: selectionRectPos.x + delta.x, y: selectionRectPos.y -delta.y})
  }

  function confirmCopy() {
    const currentLayer = getCurrentLayer();
    if (!currentLayer)
      return;

    currentLayer.vertexData.unshift(...currentLayer.selectedVertices.vertexData);
    currentLayer.selectedVertices.vertexData = [];
    
    currentLayer.brushSizeData.unshift(...currentLayer.selectedVertices.brushSizeData);
    currentLayer.selectedVertices.brushSizeData = [];

    currentLayer.colorData.unshift(...currentLayer.selectedVertices.colorData);
    currentLayer.selectedVertices.colorData = [];

    currentLayer.boundingRectData.unshift(...currentLayer.selectedVertices.boundingRectData);
    currentLayer.selectedVertices.boundingRectData = [];

    StateManager.getInstance().setState('selection-rect-size', {w: 0, y: 0});
  }

  (function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    
    const layers = StateManager.getInstance().getState('layers');
    let i = 0;
    
    if (layers) {
      layers.forEach((layer: Layer, layerIndex: number) => {
        if(!layer.visible)
          return;
  
        const vertices = layer.vertexData;
        const brushSizes = layer.brushSizeData;
        const colors = layer.colorData;
        const bindingRects = layer.boundingRectData;
        const selectedRegion = layer.selectedVertices;

        for (let j = 0, k = 0, l = 0; j < selectedRegion.vertexData.length; j+=2, k+=4, l+=1) {
          // console.log('drawing a selected vertex!!');
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 3 * i, MV.flatten([selectedRegion.vertexData.slice(j, j+2), layerIndex/1000]));

          gl.bindBuffer(gl.ARRAY_BUFFER, brushSizeBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * i, MV.flatten([selectedRegion.brushSizeData[l]]));
          
          gl.bindBuffer(gl.ARRAY_BUFFER, bindingRectBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(selectedRegion.boundingRectData.slice(k, k+4)));
          
          gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(selectedRegion.colorData.slice(k, k+4)));
          
          i++;
        }

        for (let j = 0, k = 0, l = 0; j < vertices.length; j+=2, k+= 4, l+= 1) {
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 3 * i, MV.flatten([vertices.slice(j, j+2), layerIndex/1000]));

          gl.bindBuffer(gl.ARRAY_BUFFER, brushSizeBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * i, MV.flatten([brushSizes[l]]));
          
          gl.bindBuffer(gl.ARRAY_BUFFER, bindingRectBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(bindingRects.slice(k, k+4)));
          
          gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(colors.slice(k, k+4)));
          
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

function getCurrentLayer(): Layer {
  const currentLayerId = StateManager.getInstance().getState('selectedLayer');
  return StateManager.getInstance().getState('layers').find((layer: Layer) => layer.id === currentLayerId);
}

