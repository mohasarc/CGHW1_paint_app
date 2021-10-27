import { Card, CardContent } from '@mui/material';
import { useEffect, useState } from "react";
import * as MV from '../Common/MV';
import * as INIT from '../Common/initShaders';
import * as UTILS from '../Common/webgl-utils';

import { brushShaders } from '../shaders';
import { StateManager } from "../util/StateManager";
import { addAttribute } from "../util/webglHelpers";
import { Layer, Shape } from "./Layers";

// Global variables
let PAINT_CANVAS: any;
let PAINT_CANVAS_GL: WebGLRenderingContext;

/***********************************************/
/*                 UI Components               */
/***********************************************/
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

    return <svg id={'selection-rect'} height={selectionRectHeight} width={selectionRectWidth} style={{ position: 'absolute', top: selectionRectY, left: selectionRectX }}>
        <rect x="1" y="1" height={selectionRectHeight - 2} width={selectionRectWidth - 2} style={{ stroke: '#000000', strokeWidth: '1', strokeDasharray: '2 2', fill: 'none' }} />
    </svg>;
}

export default function PaintArea() {
    useEffect(initPaintCanvas);

    return (
        <Card>
            <CardContent style={{ backgroundColor: '#3b4245' }}>
                <canvas id={'macanvas'} width={'520'} height={'550'} />
                <SelectionRect />
            </CardContent>
        </Card>
    );
}

/***********************************************/
/*                    Logic                    */
/***********************************************/

/**
 * Initializes webgl for the main painiting canvas
 */
function initPaintCanvas() {
    const canvas: any = document.getElementById('macanvas');
    const selectionRectElement = document.getElementById('selection-rect');
    if (!canvas || !selectionRectElement)
        throw new Error('Couldn\'t create the canvas');

    PAINT_CANVAS_GL = UTILS.WebGLUtils.setupWebGL(canvas, null);
    if (!PAINT_CANVAS_GL) { alert("WebGL isn't available"); }

    let maxNumVertices = 100000;
    StateManager.getInstance().setState('redraw', false);
    StateManager.getInstance().setState('newLine', true);
    StateManager.getInstance().setState('selection-start-coords', { x: 0, y: 0 });
    StateManager.getInstance().setState('selection-end-coords', { x: 0, y: 0 });
    StateManager.getInstance().setState('selection-top-left-coords', { x: 0, y: 0 });
    StateManager.getInstance().setState('selection-bottom-right-coords', { x: 0, y: 0 });
    StateManager.getInstance().setState('cropping', false);
    StateManager.getInstance().setState('selection-rect-pos', { x: 0, y: 0 });
    StateManager.getInstance().setState('selection-rect-size', { w: 0, h: 0 });

    PAINT_CANVAS_GL.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    PAINT_CANVAS_GL.clearColor(0.8, 0.8, 0.8, 1.0);

    //
    //  Load shaders and initialize attribute buffers
    //
    const program = INIT.initShaders(PAINT_CANVAS_GL, brushShaders.vertexShader, brushShaders.fragmentShader);
    PAINT_CANVAS_GL.useProgram(program);
    PAINT_CANVAS_GL.enable(PAINT_CANVAS_GL.DEPTH_TEST);

    const vertexBuffer = PAINT_CANVAS_GL.createBuffer(); // TODO can be in global state
    if (vertexBuffer)
        addAttribute(PAINT_CANVAS_GL, program, 'vPosition', vertexBuffer, maxNumVertices, 3, PAINT_CANVAS_GL.FLOAT);

    const brushSizeBuffer = PAINT_CANVAS_GL.createBuffer(); // TODO can be in global state
    if (brushSizeBuffer)
        addAttribute(PAINT_CANVAS_GL, program, 'vBrushSize', brushSizeBuffer, maxNumVertices, 1, PAINT_CANVAS_GL.FLOAT);

    const bindingRectBuffer = PAINT_CANVAS_GL.createBuffer(); // TODO can be in global state
    if (bindingRectBuffer)
        addAttribute(PAINT_CANVAS_GL, program, 'vBindingRect', bindingRectBuffer, maxNumVertices, 4, PAINT_CANVAS_GL.FLOAT);

    const colorBuffer = PAINT_CANVAS_GL.createBuffer(); // TODO can be in global state
    if (colorBuffer)
        addAttribute(PAINT_CANVAS_GL, program, 'vColor', colorBuffer, maxNumVertices, 4, PAINT_CANVAS_GL.FLOAT);

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    selectionRectElement.addEventListener("mousedown", handleMouseDown);
    selectionRectElement.addEventListener("mouseup", handleMouseUp);
    selectionRectElement.addEventListener("mousemove", handleMouseMove);

    function handleMouseUp(event: any) {
        const usedTool = StateManager.getInstance().getState('selected-tool');
        const cropping = StateManager.getInstance().getState('cropping');
        const timeLine: Layer[][] = StateManager.getInstance().getState('timeline');
        const layers: Layer[] = StateManager.getInstance().getState('layers');

        StateManager.getInstance().setState('redraw', false);
        if (usedTool === 'brush') {
            updateTimeline();
        } else if (usedTool === 'eraser') {
            updateTimeline();
        } else if (usedTool === 'crop') {
            if (!cropping) {
                copySelectedRegion();
                StateManager.getInstance().setState('cropping', true);
            }
        } else if (usedTool === 'rect') {
            finalizeRectangle();
            updateTimeline();
        } else if (usedTool === 'circle') {
            finalizeElipse();
            updateTimeline();
        } else if (usedTool === 'triangle') {
            finalizeTriangle();
            updateTimeline();
        }
    }

    function handleMouseDown(event: any) {
        const usedTool = StateManager.getInstance().getState('selected-tool');
        const cropping = StateManager.getInstance().getState('cropping');

        StateManager.getInstance().setState('redraw', true);
        StateManager.getInstance().setState('new-line', true);
        if (usedTool === 'brush') {
        } else if (usedTool === 'eraser') {
        } else if (usedTool === 'crop') {
            StateManager.getInstance().setState('selection-start-coords', { x: event.clientX - canvas.offsetLeft, y: canvas.height - (event.clientY - canvas.offsetTop) })
            if (!cropping) {
                StateManager.getInstance().setState('selection-rect-pos', { x: event.clientX, y: event.clientY });
            }
        } else if (usedTool === 'rect') {
            drawRectangle({ x: event.clientX, y: event.clientY }, { w: 0, h: 0 });
        } else if (usedTool === 'circle') {
            drawElipse({ x: event.clientX, y: event.clientY }, { w: 0, h: 0 });
        } else if (usedTool === 'triangle') {
            drawTriangle({ x: event.clientX, y: event.clientY }, { w: 0, h: 0 });
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
                erase({ x: event.clientX, y: event.clientY });
            } else if (usedTool === 'crop') {
                StateManager.getInstance().setState('selection-end-coords', { x: event.clientX - canvas.offsetLeft, y: canvas.height - (event.clientY - canvas.offsetTop) })
                if (cropping) {
                    moveCopiedRegion({ x: event.movementX, y: -event.movementY });
                } else {
                    const selectionRectPos1 = StateManager.getInstance().getState('selection-rect-pos');
                    const selectionRectPos2 = { x: event.clientX, y: event.clientY };
                    StateManager.getInstance().setState('selection-rect-size', {
                        w: selectionRectPos2.x - selectionRectPos1.x,
                        h: selectionRectPos2.y - selectionRectPos1.y
                    });
                }
            } else if (usedTool === 'rect') {
                resizeRectangle({ x: event.movementX, y: -event.movementY });
            } else if (usedTool === 'circle') {
                resizeElipse({ x: event.movementX, y: -event.movementY });
            } else if (usedTool === 'triangle') {
                resizeTriangle({ x: event.movementX, y: -event.movementY });
            }
        }
    }

    function drawRectangle(pos: { x: number, y: number }, size: { w: number, h: number }) {
        const currentLayer = getCurrentLayer();
        const newColor = MV.vec4(...StateManager.getInstance().getState('picked-color'));
        const brushSize = StateManager.getInstance().getState('brush-size');
        const bindingRect = [0, 0, canvas.width, canvas.height];

        const t1: number[] = MV.vec2((2 * ((pos.x - canvas.offsetLeft) / canvas.width) - 1),
            2 * ((canvas.height - pos.y + canvas.offsetTop) / canvas.height) - 1);

        const t2: number[] = MV.vec2((2 * (((pos.x + size.w) - canvas.offsetLeft) / canvas.width) - 1),
            2 * ((canvas.height - pos.y + canvas.offsetTop) / canvas.height) - 1);

        const t3: number[] = MV.vec2((2 * ((pos.x - canvas.offsetLeft) / canvas.width) - 1),
            2 * ((canvas.height - (pos.y + size.h) + canvas.offsetTop) / canvas.height) - 1);

        const t4: number[] = MV.vec2((2 * (((pos.x + size.w) - canvas.offsetLeft) / canvas.width) - 1),
            2 * ((canvas.height - (pos.y + size.h) + canvas.offsetTop) / canvas.height) - 1);

        console.log('The points: ', [t1, t2, t3, t4]);

        const newShape: Shape = {
            vertexData: [...t1, ...t2, ...t4, ...t3],
            colorData: [...newColor, ...newColor, ...newColor, ...newColor],
            boundingRectData: [...bindingRect, ...bindingRect, ...bindingRect, ...bindingRect],
            brushSize: [brushSize, brushSize, brushSize, brushSize],
            type: 'dotted-rectangle',
        }

        currentLayer.shapes.unshift(newShape);
    }

    function resizeRectangle(delta: { x: number, y: number }) {
        // get the last shape (which will be a rectangle)
        // change its size
        const currentLayer = getCurrentLayer();

        console.log('resizing rectangle:', delta);

        // first vertex x,y
        currentLayer.shapes[0].vertexData[2] += delta.x / canvas.width * 2;
        // currentLayer.shapes[0].vertexData[3] += delta.y/canvas.height;

        // second vertex x,y
        currentLayer.shapes[0].vertexData[4] += delta.x / canvas.width * 2;
        currentLayer.shapes[0].vertexData[5] += delta.y / canvas.height * 2;

        // third vertex x,y
        // currentLayer.shapes[0].vertexData[6] += delta.x/canvas.width;
        currentLayer.shapes[0].vertexData[7] += delta.y / canvas.height * 2;
    }

    function finalizeRectangle() {
        const currentLayer = getCurrentLayer();
        currentLayer.shapes[0].type = 'rectangle';
    }

    function drawTriangle(pos: { x: number, y: number }, size: { w: number, h: number }) {
        const currentLayer = getCurrentLayer();
        const newColor = MV.vec4(...StateManager.getInstance().getState('picked-color'));
        const brushSize = StateManager.getInstance().getState('brush-size');
        const bindingRect = [0, 0, canvas.width, canvas.height];

        const t1: number[] = MV.vec2((2 * ((pos.x - canvas.offsetLeft) / canvas.width) - 1),
            2 * ((canvas.height - pos.y + canvas.offsetTop) / canvas.height) - 1);

        const t2: number[] = MV.vec2((2 * (((pos.x + size.w / 2) - canvas.offsetLeft) / canvas.width) - 1),
            2 * ((canvas.height - (pos.y + size.h) + canvas.offsetTop) / canvas.height) - 1);

        const t3: number[] = MV.vec2((2 * (((pos.x - size.w / 2) - canvas.offsetLeft) / canvas.width) - 1),
            2 * ((canvas.height - (pos.y + size.h) + canvas.offsetTop) / canvas.height) - 1);

        console.log('The points: ', [t1, t2, t3]);

        const newShape: Shape = {
            vertexData: [...t2, ...t3, ...t1],
            // vertexData: [0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0],
            colorData: [...newColor, ...newColor, ...newColor],
            boundingRectData: [...bindingRect, ...bindingRect, ...bindingRect],
            brushSize: [brushSize, brushSize, brushSize],
            type: 'dotted-triangle',
        }

        currentLayer.shapes.unshift(newShape);
    }

    function resizeTriangle(delta: { x: number, y: number }) {
        // get the last shape (which will be a rectangle)
        // change its size
        const currentLayer = getCurrentLayer();

        console.log('resizing rectangle:', delta);

        // first vertex x,y
        currentLayer.shapes[0].vertexData[2] += delta.x / canvas.width * 2;
        currentLayer.shapes[0].vertexData[3] += delta.y / canvas.height * 2;

        // second vertex x,y
        currentLayer.shapes[0].vertexData[4] -= delta.x / canvas.width * 2;
        currentLayer.shapes[0].vertexData[5] += delta.y / canvas.height * 2;
    }

    function finalizeTriangle() {
        const currentLayer = getCurrentLayer();
        currentLayer.shapes[0].type = 'triangle';
    }

    function drawElipse(pos: { x: number, y: number }, size: { w: number, h: number }) {
        const center: number[] = MV.vec2((2 * ((pos.x - canvas.offsetLeft) / canvas.width) - 1),
            2 * ((canvas.height - pos.y + canvas.offsetTop) / canvas.height) - 1); // center
        const currentLayer = getCurrentLayer();
        const newColor: number[] = MV.vec4(...StateManager.getInstance().getState('picked-color'));
        const brushSize: number = StateManager.getInstance().getState('brush-size');
        const bindingRect: number[] = [0, 0, canvas.width, canvas.height];

        const newShape: Shape = {
            vertexData: [],
            // vertexData: [0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0],
            colorData: [],
            boundingRectData: [],
            brushSize: [],
            type: 'dotted-elipse',
            center: [...center],
            size: { ...size },
        }
        // according to ellipse equation
        const radiusX = Math.abs(size.w / canvas.width);
        const radiusY = Math.abs(size.h / canvas.height);

        for (let i = 0; i < 32; i++) {
            const t: number[] = MV.vec2(center[0] + radiusX * Math.cos(i * Math.PI / 16), center[1] + radiusY * Math.sin(i * Math.PI / 16));
            newShape.vertexData.push(...t);
            newShape.colorData.push(...newColor);
            newShape.boundingRectData.push(...bindingRect);
            newShape.brushSize.push(brushSize);
        }

        currentLayer.shapes.unshift(newShape);
    }

    function resizeElipse(delta: { x: number, y: number }) {
        // get the last shape (which will be a rectangle)
        // change its size
        const currentLayer = getCurrentLayer();
        const center = currentLayer.shapes[0].center;
        const curSize = currentLayer.shapes[0].size;
        if (!center || !curSize)
            return;

        const updatedVertexData: number[] = []
        const newSize = { w: curSize.w + delta.x * 2, h: curSize.h + delta.y * 2 };
        // according to ellipse equation
        const radiusX = Math.abs(newSize.w / canvas.width);
        const radiusY = Math.abs(newSize.h / canvas.height);

        for (let i = 0; i < 32; i++) {
            const t: number[] = MV.vec2(center[0] + radiusX * Math.cos(i * Math.PI / 16), center[1] + radiusY * Math.sin(i * Math.PI / 16));
            updatedVertexData.push(...t);
        }

        currentLayer.shapes[0].vertexData = [...updatedVertexData];
        currentLayer.shapes[0].size = { ...newSize };
    }

    function finalizeElipse() {
        const currentLayer = getCurrentLayer();
        currentLayer.shapes[0].type = 'elipse';
    }

    function erase(pos: { x: number, y: number }) {
        const currentLayer = getCurrentLayer();
        if (!currentLayer)
            return;

        const brushSize = StateManager.getInstance().getState('brush-size') / canvas.width;
        const posClip = MV.vec2((2 * ((pos.x - canvas.offsetLeft) / canvas.width) - 1),
            2 * ((canvas.height - pos.y + canvas.offsetTop) / canvas.height) - 1);

        currentLayer.shapes = currentLayer.shapes.filter((shape) => {
            for (let i = 0; i < shape.vertexData.length; i += 2) {
                console.log('distance between', shape.vertexData.slice(i, i + 2), posClip, 'is ', findLinearDistance(shape.vertexData.slice(i, i + 2), posClip))
                if (findLinearDistance(shape.vertexData.slice(i, i + 2), posClip) <= brushSize) {
                    // remove shape
                    return false;
                }

                return true;
            }
        });
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
                brushSize: [brushSize],
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
            console.log('Will find mid point')
            const c = findMidPoint(a, b);
            console.log('adding midPoint at: ', c);
            allPoints.unshift(c);
            addMidPoint(a, c, allPoints);
            addMidPoint(c, b, allPoints);
        }
    }

    function findMidPoint(a: number[], b: number[]) {
        return MV.vec2((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }

    function findLinearDistance(a: number[], b: number[]) {
        const dx = Math.abs(a[0] - b[0]);
        const dy = Math.abs(a[1] - b[1]);
        return Math.sqrt(dx * dx + dy * dy);
    }

    function updateTimeline() {
        const layers: Layer[] = StateManager.getInstance().getState('layers');
        const curTimelineNode = StateManager.getInstance().getState('cur-timeline-node');
        let timeline: Layer[][] = StateManager.getInstance().getState('timeline');

        if (curTimelineNode !== timeline.length - 1) {
            timeline = timeline.slice(0, curTimelineNode + 1);
        }

        timeline.push(JSON.parse(JSON.stringify(layers)));
        StateManager.getInstance().setState('cur-timeline-node', timeline.length - 1);
        StateManager.getInstance().setState('timeline', timeline);
    }

    document.addEventListener('keyup', (event: any) => {
        const cropping = StateManager.getInstance().getState('cropping');
        const code = event.code;
        if (code === 'Escape') {
            if (cropping) {
                StateManager.getInstance().setState('cropping', false);
                confirmCopy();
                updateTimeline();
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
            if (shape.type === 'point') {
                for (let i = 0; i < shape.vertexData.length; i += 2) {
                    const point = MV.vec2(shape.vertexData[i], shape.vertexData[i + 1]);
                    if ( // point in bounding rectangle
                        point[0] > ((selectionRectTopLeft.x / canvas.width) * 2) - 1
                        && point[0] < ((selectionRectBotRight.x / canvas.width) * 2) - 1
                        && point[1] > ((selectionRectBotRight.y / canvas.height) * 2) - 1
                        && point[1] < ((selectionRectTopLeft.y / canvas.height) * 2) - 1
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

                        let mostRightX1 = selectionRect.x1 > existingBoundingRect.x1 ? selectionRect.x1 : existingBoundingRect.x1;
                        let mostTopY1 = selectionRect.y1 > existingBoundingRect.y1 ? selectionRect.y1 : existingBoundingRect.y1;
                        let mostLeftX2 = selectionRect.x2 < existingBoundingRect.x2 ? selectionRect.x2 : existingBoundingRect.x2;
                        let mostBottomY2 = selectionRect.y2 < existingBoundingRect.y2 ? selectionRect.y2 : existingBoundingRect.y2;

                        selectedShapes.push({
                            vertexData: [...shape.vertexData],
                            colorData: [...shape.colorData],
                            brushSize: [...shape.brushSize],
                            boundingRectData: [
                                mostRightX1,
                                mostTopY1,
                                Math.abs(mostLeftX2 - mostRightX1),
                                Math.abs(mostBottomY2 - mostTopY1),
                            ],
                            type: shape.type,
                        });

                        croppingLayer.shapes = selectedShapes;
                        StateManager.getInstance().setState('cropping-layer', croppingLayer);
                        continue;
                    }
                }
            }
        });
    }

    function moveCopiedRegion(delta: { x: number, y: number }) {
        // go over the vertices of the current layer
        const currentLayer = getCurrentLayer();
        const croppingLayer = StateManager.getInstance().getState('cropping-layer');
        if (!currentLayer || !croppingLayer)
            return;

        croppingLayer.shapes.forEach((shape: Shape) => {
            for (let i = 0; i < shape.vertexData.length; i += 2) {
                shape.vertexData[i] += delta.x / canvas.width * 2;
                shape.vertexData[i + 1] += delta.y / canvas.height * 2;
            }
            shape.boundingRectData[0] += delta.x;
            shape.boundingRectData[1] += delta.y;
        });

        const selectionRectPos = StateManager.getInstance().getState('selection-rect-pos');
        StateManager.getInstance().setState('selection-rect-pos', { x: selectionRectPos.x + delta.x, y: selectionRectPos.y - delta.y })
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
        StateManager.getInstance().setState('selection-rect-size', { w: 0, y: 0 });
    }

    (function render() {
        PAINT_CANVAS_GL.clear(PAINT_CANVAS_GL.COLOR_BUFFER_BIT);
        PAINT_CANVAS_GL.clear(PAINT_CANVAS_GL.DEPTH_BUFFER_BIT);
        PAINT_CANVAS_GL.useProgram(program);

        const layers = StateManager.getInstance().getState('layers');
        const croppingLayer = StateManager.getInstance().getState('cropping-layer');
        let i = 0;
        let lastRenderingEndIndex = 0;

        croppingLayer.shapes.forEach((shape: Shape, shapeIndex: number) => {
            PAINT_CANVAS_GL.bindBuffer(PAINT_CANVAS_GL.ARRAY_BUFFER, vertexBuffer);
            for (let k = 0; k < shape.vertexData.length; k += 2) {
                PAINT_CANVAS_GL.bufferSubData(PAINT_CANVAS_GL.ARRAY_BUFFER, (4 * 3 * i) + ((k / 2) * 3 * 4), MV.flatten([shape.vertexData.slice(k, k + 2), 100 / 1000]));
            }

            PAINT_CANVAS_GL.bindBuffer(PAINT_CANVAS_GL.ARRAY_BUFFER, brushSizeBuffer);
            PAINT_CANVAS_GL.bufferSubData(PAINT_CANVAS_GL.ARRAY_BUFFER, 4 * i, MV.flatten([...shape.brushSize]));

            PAINT_CANVAS_GL.bindBuffer(PAINT_CANVAS_GL.ARRAY_BUFFER, bindingRectBuffer);
            PAINT_CANVAS_GL.bufferSubData(PAINT_CANVAS_GL.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(shape.boundingRectData));

            PAINT_CANVAS_GL.bindBuffer(PAINT_CANVAS_GL.ARRAY_BUFFER, colorBuffer);
            PAINT_CANVAS_GL.bufferSubData(PAINT_CANVAS_GL.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(shape.colorData));

            if (shape.type === 'point') {
                i++;
            } else if (shape.type === 'dotted-rectangle' || shape.type === 'rectangle') {
                i += 4;
            } else if (shape.type === 'dotted-triangle' || shape.type === 'triangle') {
                i += 3;
            } else if (shape.type === 'dotted-elipse' || shape.type === 'elipse') {
                i += 32;
            }

            const nextShapeType = croppingLayer.shapes[shapeIndex + 1]?.type;
            if (nextShapeType !== shape.type || shapeIndex === croppingLayer.shapes.length - 1) {
                if (shape.type === 'point') {
                    PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.POINTS, lastRenderingEndIndex, (i - 1 - lastRenderingEndIndex));
                } else if (shape.type === 'dotted-rectangle') {
                    const numRectangles = (i - lastRenderingEndIndex) / 4;
                    for (let r = 0; r < numRectangles; r++) {
                        PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 4 * r, 4);
                    }
                } else if (shape.type === 'rectangle') {
                    const numRectangles = (i - lastRenderingEndIndex) / 4;
                    for (let r = 0; r < numRectangles; r++) {
                        PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLE_FAN, lastRenderingEndIndex + 4 * r, 4);
                    }
                } else if (shape.type === 'dotted-triangle') {
                    const numTriangles = (i - lastRenderingEndIndex) / 3;
                    for (let t = 0; t < numTriangles; t++) {
                        PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 3 * t, 3);
                    }
                } else if (shape.type === 'triangle') {
                    const numTriangles = (i - lastRenderingEndIndex) / 3;
                    for (let t = 0; t < numTriangles; t++) {
                        PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLES, lastRenderingEndIndex + 3 * t, 3);
                    }
                } else if (shape.type === 'dotted-elipse') {
                    const numElipses = (i - lastRenderingEndIndex) / 32;
                    for (let t = 0; t < numElipses; t++) {
                        PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 32 * t, 32);
                    }
                } else if (shape.type === 'elipse') {
                    const numElipses = (i - lastRenderingEndIndex) / 32;
                    for (let t = 0; t < numElipses; t++) {
                        PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLE_FAN, lastRenderingEndIndex + 32 * t, 32);
                    }
                }

                lastRenderingEndIndex = i;
            }
        });

        if (layers) {
            layers.forEach((layer: Layer, layerIndex: number) => {
                if (!layer.visible)
                    return;

                layer.shapes.forEach((shape, shapeIndex) => {
                    PAINT_CANVAS_GL.bindBuffer(PAINT_CANVAS_GL.ARRAY_BUFFER, vertexBuffer);
                    for (let k = 0; k < shape.vertexData.length; k += 2) {
                        PAINT_CANVAS_GL.bufferSubData(PAINT_CANVAS_GL.ARRAY_BUFFER, (4 * 3 * i) + ((k / 2) * 3 * 4), MV.flatten([shape.vertexData.slice(k, k + 2), layerIndex / 1000]));
                    }

                    PAINT_CANVAS_GL.bindBuffer(PAINT_CANVAS_GL.ARRAY_BUFFER, brushSizeBuffer);
                    PAINT_CANVAS_GL.bufferSubData(PAINT_CANVAS_GL.ARRAY_BUFFER, 4 * i, MV.flatten([...shape.brushSize]));

                    PAINT_CANVAS_GL.bindBuffer(PAINT_CANVAS_GL.ARRAY_BUFFER, bindingRectBuffer);
                    PAINT_CANVAS_GL.bufferSubData(PAINT_CANVAS_GL.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(shape.boundingRectData));

                    PAINT_CANVAS_GL.bindBuffer(PAINT_CANVAS_GL.ARRAY_BUFFER, colorBuffer);
                    PAINT_CANVAS_GL.bufferSubData(PAINT_CANVAS_GL.ARRAY_BUFFER, 4 * 4 * i, MV.flatten(shape.colorData));

                    if (shape.type === 'point') {
                        i++;
                    } else if (shape.type === 'dotted-rectangle' || shape.type === 'rectangle') {
                        i += 4;
                    } else if (shape.type === 'dotted-triangle' || shape.type === 'triangle') {
                        i += 3;
                    } else if (shape.type === 'dotted-elipse' || shape.type === 'elipse') {
                        i += 32;
                    }

                    const nextShapeType = layer.shapes[shapeIndex + 1]?.type;
                    if (nextShapeType !== shape.type || shapeIndex === layer.shapes.length - 1) {
                        if (shape.type === 'point') {
                            PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.POINTS, lastRenderingEndIndex, (i - 1 - lastRenderingEndIndex));
                        } else if (shape.type === 'dotted-rectangle') {
                            const numRectangles = (i - lastRenderingEndIndex) / 4;
                            for (let r = 0; r < numRectangles; r++) {
                                PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 4 * r, 4);
                            }
                        } else if (shape.type === 'rectangle') {
                            const numRectangles = (i - lastRenderingEndIndex) / 4;
                            for (let r = 0; r < numRectangles; r++) {
                                PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLE_FAN, lastRenderingEndIndex + 4 * r, 4);
                            }
                        } else if (shape.type === 'dotted-triangle') {
                            const numTriangles = (i - lastRenderingEndIndex) / 3;
                            for (let t = 0; t < numTriangles; t++) {
                                PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 3 * t, 3);
                            }
                        } else if (shape.type === 'triangle') {
                            const numTriangles = (i - lastRenderingEndIndex) / 3;
                            for (let t = 0; t < numTriangles; t++) {
                                PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLES, lastRenderingEndIndex + 3 * t, 3);
                            }
                        } else if (shape.type === 'dotted-elipse') {
                            const numElipses = (i - lastRenderingEndIndex) / 32;
                            for (let t = 0; t < numElipses; t++) {
                                PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 32 * t, 32);
                            }
                        } else if (shape.type === 'elipse') {
                            const numElipses = (i - lastRenderingEndIndex) / 32;
                            for (let t = 0; t < numElipses; t++) {
                                PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLE_FAN, lastRenderingEndIndex + 32 * t, 32);
                            }
                        }

                        lastRenderingEndIndex = i;
                    }
                });
            });
        }

        /************ Draw Lines **************/
        // PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.POINTS, 0, i);

        requestAnimationFrame(render);
    })();
}

function getCurrentLayer(): Layer {
    const currentLayerId = StateManager.getInstance().getState('selectedLayer');
    return StateManager.getInstance().getState('layers').find((layer: Layer) => layer.id === currentLayerId);
}

