import { Card, CardContent } from '@mui/material';
import { useEffect, useState } from "react";
import * as MV from '../Common/MV';
import * as INIT from '../Common/initShaders';
import * as UTILS from '../Common/webgl-utils';

import { brushShaders } from '../shaders';
import { StateManager } from "../util/StateManager";
import { addAttribute } from "../util/webglHelpers";
import { Layer, Shape } from "./Layers";

function SelectionRect() {
    const [selectionRectWidth, setSelectionRectWidth] = useState(0);
    const [selectionRectHeight, setSelectionRectHeight] = useState(0);
    const [selectionRectX, setSelectionRectX] = useState(0);
    const [selectionRectY, setSelectionRectY] = useState(0);

    StateManager.getInstance().subscribe('selection-rect-pos', () => {
      handlePropChange();
    });

    StateManager.getInstance().subscribe('selection-rect-size', () => {
      handlePropChange();
    });
    
    function handlePropChange() {
      const newRectSize = StateManager.getInstance().getState('selection-rect-size');
      const newRectPos = StateManager.getInstance().getState('selection-rect-pos');
      
      if (!newRectPos || !newRectSize)
        return;
      
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
  let gl: WebGLRenderingContext;
  const canvas: any = document.getElementById('macanvas');
  const selectionRectElement = document.getElementById('selection-rect');
  if (!canvas || !selectionRectElement)
    throw new Error('Couldn\'t create the canvas');
  
  gl = UTILS.WebGLUtils.setupWebGL(canvas, null);
  if (!gl) { alert("WebGL isn't available"); }

  let maxNumVertices = 100000;
  StateManager.getInstance().setState('redraw', false);
  StateManager.getInstance().setState('newLine', true);
  StateManager.getInstance().setState('selection-start-coords',  {x: 0, y: 0});
  StateManager.getInstance().setState('selection-end-coords',  {x: 0, y: 0});
  StateManager.getInstance().setState('selection-top-left-coords',  {x: 0, y: 0});
  StateManager.getInstance().setState('selection-bottom-right-coords',  {x: 0, y: 0});
  StateManager.getInstance().setState('cropping', false);
  StateManager.getInstance().setState('selection-rect-pos', {x: 0, y: 0});
  StateManager.getInstance().setState('selection-rect-size', {w: 0, h: 0});

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
    StateManager.getInstance().setState('redraw', false);
    const cropping = StateManager.getInstance().getState('cropping');
    if (StateManager.getInstance().getState('selected-tool') === 'crop') {
      if (!cropping) {
        copySelectedRegion();
        StateManager.getInstance().setState('cropping', true);
      }
    }
  }

  function handleMouseDown(event: any) {
    const usedTool = StateManager.getInstance().getState('selected-tool');
    const cropping = StateManager.getInstance().getState('cropping');
    StateManager.getInstance().setState('redraw', true);
    StateManager.getInstance().setState('new-line', true);
    if (usedTool === 'crop') {
      StateManager.getInstance().setState('selection-start-coords', {x: event.clientX - canvas.offsetLeft, y: canvas.height - (event.clientY - canvas.offsetTop)})
      if (!cropping) {
        StateManager.getInstance().setState('selection-rect-pos', {x: event.clientX, y: event.clientY});
      }
    }
  }

  function handleMouseMove(event: any) {
    const redraw = StateManager.getInstance().getState('redraw');
    const usedTool = StateManager.getInstance().getState('selected-tool');
    const cropping = StateManager.getInstance().getState('cropping');
    if (redraw) {
      if (usedTool === 'brush') {
        freeDraw(event);
      } else if (usedTool === 'eraser') {

      } else if (usedTool === 'crop') {
        StateManager.getInstance().setState('selection-end-coords', {x: event.clientX - canvas.offsetLeft, y: canvas.height - (event.clientY - canvas.offsetTop)})
        if (cropping) {
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
      const newLine = StateManager.getInstance().getState('new-line');
      const currentLayer = getCurrentLayer();
      if (!currentLayer)
        return;

      let newVertex = MV.vec2((2 * ((event.clientX - canvas.offsetLeft) / canvas.width) - 1),
        2 * ((canvas.height - event.clientY + canvas.offsetTop) / canvas.height) - 1);
      const newColor = MV.vec4(...StateManager.getInstance().getState('picked-color'));
      const brushSize = StateManager.getInstance().getState('brush-size');
      const bindingRect = [0, 0, canvas.width, canvas.height];
      let allPointsVertexData: number[][] = [newVertex];
      
      if (!newLine) {
          const prevPoint = currentLayer.shapes[0];
          const prevPointVertexData = MV.vec2(prevPoint.vertexData[0], prevPoint.vertexData[1]);
          addMidPoint(newVertex, prevPointVertexData, allPointsVertexData);
        } else {
          StateManager.getInstance().setState('new-line', false);
        }
      
        allPointsVertexData.forEach((point) => {
          const newShape: Shape = {
            vertexData: [...point],
            colorData: [...newColor],
            boundingRectData: [...bindingRect],
            brushSize: brushSize,
            type: 'point',
          }

          currentLayer.shapes.unshift(newShape);
        })
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
    const cropping = StateManager.getInstance().getState('cropping'); 
    const code = event.code;
    if (code === 'Escape') {
      if (cropping) {
        StateManager.getInstance().setState('cropping', false);
        confirmCopy();
      }
    }
  });
  
  function copySelectedRegion() {
    // go over the vertices of the current layer
    const selectionRectStartCoords = StateManager.getInstance().getState('selection-start-coords');
    const selectionRectEndCoords = StateManager.getInstance().getState('selection-end-coords');
    const selectionRectTopLeft = StateManager.getInstance().getState('selection-top-left-coords');
    const selectionRectBotRight = StateManager.getInstance().getState('selection-bottom-right-coords');
    const croppingLayer = StateManager.getInstance().getState('cropping-layer');
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

    const selectedShapes: Shape[] = [];
    currentLayer.shapes.forEach((shape) => {

      const point = MV.vec2(shape.vertexData[0], shape.vertexData[1]);
      if ( // point in bounding rectangle
        point[0] > ((selectionRectTopLeft.x/canvas.width)*2)-1
        && point[0] < ((selectionRectBotRight.x/canvas.width)*2)-1
        && point[1] > ((selectionRectBotRight.y/canvas.height)*2)-1
        && point[1] < ((selectionRectTopLeft.y/canvas.height)*2)-1
      ) {
        console.log('found', point)
        
        const existingBoundingRect = { 
          x1: shape.boundingRectData[0], // BotLeft
          y1: shape.boundingRectData[1],
          x2: shape.boundingRectData[0] + shape.boundingRectData[2], // TopRight
          y2: shape.boundingRectData[1] + shape.boundingRectData[3],
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
        
        selectedShapes.push({
          vertexData: [...shape.vertexData],
          colorData: [...shape.colorData],
          brushSize: shape.brushSize,
          boundingRectData: [
            mostRightX1,
            mostTopY1,
            Math.abs(mostLeftX2 - mostRightX1),
            Math.abs(mostBottomY2 - mostTopY1),
          ],
          type: 'point',
        });

        croppingLayer.shapes = selectedShapes;
        StateManager.getInstance().setState('cropping-layer', croppingLayer);
      }
    });
  }

  function moveCopiedRegion(delta: {x: number, y: number}) {
    // go over the vertices of the current layer
    const currentLayer = getCurrentLayer();
    const croppingLayer = StateManager.getInstance().getState('cropping-layer');
    if (!currentLayer || !croppingLayer)
      return;

    croppingLayer.shapes.forEach((shape: Shape) => {
      shape.vertexData[0] += delta.x/canvas.width*2;
      shape.vertexData[1] += delta.y/canvas.height*2;
      shape.boundingRectData[0] += delta.x;
      shape.boundingRectData[1] += delta.y;
    });
    
    const selectionRectPos = StateManager.getInstance().getState('selection-rect-pos');
    StateManager.getInstance().setState('selection-rect-pos', {x: selectionRectPos.x + delta.x, y: selectionRectPos.y -delta.y})
    StateManager.getInstance().setState('cropping-layer', croppingLayer);
  }

  function confirmCopy() {
    const currentLayer = getCurrentLayer();
    const croppingLayer = StateManager.getInstance().getState('cropping-layer')
    if (!currentLayer)
      return;

    currentLayer.shapes.unshift(...croppingLayer.shapes);
    croppingLayer.shapes = [];

    StateManager.getInstance().setState('cropping-layer', croppingLayer);
    StateManager.getInstance().setState('selection-rect-size', {w: 0, y: 0});
  }

  (function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    
    const layers = StateManager.getInstance().getState('layers');
    const croppingLayer = StateManager.getInstance().getState('cropping-layer');
    let i = 0;

    croppingLayer.shapes.forEach((shape: Shape) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 3 * i, MV.flatten([shape.vertexData, 100/1000]));

      gl.bindBuffer(gl.ARRAY_BUFFER, brushSizeBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 4 * i, MV.flatten([shape.brushSize]));
      
      gl.bindBuffer(gl.ARRAY_BUFFER, bindingRectBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(shape.boundingRectData));
      
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(shape.colorData));
      
      i++;
    });
    
    if (layers) {
      layers.forEach((layer: Layer, layerIndex: number) => {
        if(!layer.visible)
          return;

        layer.shapes.forEach((shape) => {
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 3 * i, MV.flatten([shape.vertexData, layerIndex/1000]));

          gl.bindBuffer(gl.ARRAY_BUFFER, brushSizeBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * i, MV.flatten([shape.brushSize]));
          
          gl.bindBuffer(gl.ARRAY_BUFFER, bindingRectBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(shape.boundingRectData));
          
          gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(shape.colorData));
          
          i++;
        });
      });
    }
  
    /************ Draw Lines **************/
    gl.drawArrays(gl.POINTS, 0, i);

    requestAnimationFrame(render);
  })();
}

function getCurrentLayer(): Layer {
  const currentLayerId = StateManager.getInstance().getState('selectedLayer');
  return StateManager.getInstance().getState('layers').find((layer: Layer) => layer.id === currentLayerId);
}

