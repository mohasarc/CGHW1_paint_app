import { Card, CardContent } from '@mui/material';
import { useEffect, useState } from "react";
import * as MV from '../Common/MV';
import * as INIT from '../Common/initShaders';
import * as UTILS from '../Common/webgl-utils';

import { brushShaders } from '../shaders';
import { StateManager } from "../util/StateManager";
import { addAttribute } from "../util/webglHelpers";
import { Layer, Shape } from "./Layers";
import Point2D from '../util/Point2D';
import Size2D from '../util/Size2D';

// Global variables
let PAINT_CANVAS: any;
let PAINT_CANVAS_GL: WebGLRenderingContext;
let WEBGL_PROGRAM: any;
let vertexBuffer: WebGLBuffer | null;
let brushSizeBuffer: WebGLBuffer | null;
let bindingRectBuffer: WebGLBuffer | null;
let colorBuffer: WebGLBuffer | null;

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

/**
 * Initializes webgl for the main painiting PAINT_CANVAS
 */
function initPaintCanvas() {
    PAINT_CANVAS = document.getElementById('macanvas');
    const selectionRectElement = document.getElementById('selection-rect');
    if (!PAINT_CANVAS || !selectionRectElement)
        throw new Error('Couldn\'t create the PAINT_CANVAS');

    PAINT_CANVAS_GL = UTILS.WebGLUtils.setupWebGL(PAINT_CANVAS, null);
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

    PAINT_CANVAS_GL.viewport(0, 0, PAINT_CANVAS.clientWidth, PAINT_CANVAS.clientHeight);
    PAINT_CANVAS_GL.clearColor(0.8, 0.8, 0.8, 1.0);

    /*****  Load shaders and initialize attribute buffers *****/
    WEBGL_PROGRAM = INIT.initShaders(PAINT_CANVAS_GL, brushShaders.vertexShader, brushShaders.fragmentShader);
    PAINT_CANVAS_GL.useProgram(WEBGL_PROGRAM);
    PAINT_CANVAS_GL.enable(PAINT_CANVAS_GL.DEPTH_TEST);

    vertexBuffer = PAINT_CANVAS_GL.createBuffer();
    if (vertexBuffer)
        addAttribute(PAINT_CANVAS_GL, WEBGL_PROGRAM, 'vPosition', vertexBuffer, maxNumVertices, 3, PAINT_CANVAS_GL.FLOAT);

    brushSizeBuffer = PAINT_CANVAS_GL.createBuffer();
    if (brushSizeBuffer)
        addAttribute(PAINT_CANVAS_GL, WEBGL_PROGRAM, 'vBrushSize', brushSizeBuffer, maxNumVertices, 1, PAINT_CANVAS_GL.FLOAT);

    bindingRectBuffer = PAINT_CANVAS_GL.createBuffer();
    if (bindingRectBuffer)
        addAttribute(PAINT_CANVAS_GL, WEBGL_PROGRAM, 'vBindingRect', bindingRectBuffer, maxNumVertices, 4, PAINT_CANVAS_GL.FLOAT);

    colorBuffer = PAINT_CANVAS_GL.createBuffer();
    if (colorBuffer)
        addAttribute(PAINT_CANVAS_GL, WEBGL_PROGRAM, 'vColor', colorBuffer, maxNumVertices, 4, PAINT_CANVAS_GL.FLOAT);

    /*****  Initialize event listenters *****/
    PAINT_CANVAS.addEventListener("mousedown", handleMouseDown);
    selectionRectElement.addEventListener("mousedown", handleMouseDown);
    PAINT_CANVAS.addEventListener("mouseup", handleMouseUp);
    PAINT_CANVAS.addEventListener("mousemove", handleMouseMove);
    selectionRectElement.addEventListener("mouseup", handleMouseUp);
    selectionRectElement.addEventListener("mousemove", handleMouseMove);

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

    /***** Start the rendering loop *****/
    render();
}

/**
 * This function will be called on every fram to calculate what to draw to the frame buffer
 */
function render() {
    PAINT_CANVAS_GL.clear(PAINT_CANVAS_GL.COLOR_BUFFER_BIT);
    PAINT_CANVAS_GL.clear(PAINT_CANVAS_GL.DEPTH_BUFFER_BIT);
    PAINT_CANVAS_GL.useProgram(WEBGL_PROGRAM);

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
        } else if (shape.type === 'nofill-rectangle' || shape.type === 'rectangle') {
            i += 4;
        } else if (shape.type === 'nofill-triangle' || shape.type === 'triangle') {
            i += 3;
        } else if (shape.type === 'nofill-elipse' || shape.type === 'elipse') {
            i += 32;
        }

        const nextShapeType = croppingLayer.shapes[shapeIndex + 1]?.type;
        if (nextShapeType !== shape.type || shapeIndex === croppingLayer.shapes.length - 1) {
            if (shape.type === 'point') {
                PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.POINTS, lastRenderingEndIndex, (i - 1 - lastRenderingEndIndex));
            } else if (shape.type === 'nofill-rectangle') {
                const numRectangles = (i - lastRenderingEndIndex) / 4;
                for (let r = 0; r < numRectangles; r++) {
                    PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 4 * r, 4);
                }
            } else if (shape.type === 'rectangle') {
                const numRectangles = (i - lastRenderingEndIndex) / 4;
                for (let r = 0; r < numRectangles; r++) {
                    PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLE_FAN, lastRenderingEndIndex + 4 * r, 4);
                }
            } else if (shape.type === 'nofill-triangle') {
                const numTriangles = (i - lastRenderingEndIndex) / 3;
                for (let t = 0; t < numTriangles; t++) {
                    PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 3 * t, 3);
                }
            } else if (shape.type === 'triangle') {
                const numTriangles = (i - lastRenderingEndIndex) / 3;
                for (let t = 0; t < numTriangles; t++) {
                    PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLES, lastRenderingEndIndex + 3 * t, 3);
                }
            } else if (shape.type === 'nofill-elipse') {
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
                } else if (shape.type === 'nofill-rectangle' || shape.type === 'rectangle') {
                    i += 4;
                } else if (shape.type === 'nofill-triangle' || shape.type === 'triangle') {
                    i += 3;
                } else if (shape.type === 'nofill-elipse' || shape.type === 'elipse') {
                    i += 32;
                }

                const nextShapeType = layer.shapes[shapeIndex + 1]?.type;
                if (nextShapeType !== shape.type || shapeIndex === layer.shapes.length - 1) {
                    if (shape.type === 'point') {
                        PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.POINTS, lastRenderingEndIndex, (i - 1 - lastRenderingEndIndex));
                    } else if (shape.type === 'nofill-rectangle') {
                        const numRectangles = (i - lastRenderingEndIndex) / 4;
                        for (let r = 0; r < numRectangles; r++) {
                            PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 4 * r, 4);
                        }
                    } else if (shape.type === 'rectangle') {
                        const numRectangles = (i - lastRenderingEndIndex) / 4;
                        for (let r = 0; r < numRectangles; r++) {
                            PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLE_FAN, lastRenderingEndIndex + 4 * r, 4);
                        }
                    } else if (shape.type === 'nofill-triangle') {
                        const numTriangles = (i - lastRenderingEndIndex) / 3;
                        for (let t = 0; t < numTriangles; t++) {
                            PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.LINE_LOOP, lastRenderingEndIndex + 3 * t, 3);
                        }
                    } else if (shape.type === 'triangle') {
                        const numTriangles = (i - lastRenderingEndIndex) / 3;
                        for (let t = 0; t < numTriangles; t++) {
                            PAINT_CANVAS_GL.drawArrays(PAINT_CANVAS_GL.TRIANGLES, lastRenderingEndIndex + 3 * t, 3);
                        }
                    } else if (shape.type === 'nofill-elipse') {
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

    requestAnimationFrame(render);
}

/**
 * 
 */
function handleMouseUp() {
    const usedTool = StateManager.getInstance().getState('selected-tool');
    const cropping = StateManager.getInstance().getState('cropping');

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

/**
 * 
 * @param event 
 */
function handleMouseDown(event: any) {
    const usedTool = StateManager.getInstance().getState('selected-tool');
    const cropping = StateManager.getInstance().getState('cropping');

    StateManager.getInstance().setState('redraw', true);
    StateManager.getInstance().setState('new-line', true);
    if (usedTool === 'brush') {
    } else if (usedTool === 'eraser') {
    } else if (usedTool === 'crop') {
        StateManager.getInstance().setState('selection-start-coords', { x: event.clientX - PAINT_CANVAS.offsetLeft, y: PAINT_CANVAS.height - (event.clientY - PAINT_CANVAS.offsetTop) })
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

/**
 * 
 * @param event 
 */
function handleMouseMove(event: any) {
    const redraw = StateManager.getInstance().getState('redraw');
    const usedTool = StateManager.getInstance().getState('selected-tool');
    const cropping = StateManager.getInstance().getState('cropping');
    if (redraw) {
        if (usedTool === 'brush') {
            freeDraw({ x: event.clientX, y: event.clientY });
        } else if (usedTool === 'eraser') {
            erase({ x: event.clientX, y: event.clientY });
        } else if (usedTool === 'crop') {
            StateManager.getInstance().setState('selection-end-coords', { x: event.clientX - PAINT_CANVAS.offsetLeft, y: PAINT_CANVAS.height - (event.clientY - PAINT_CANVAS.offsetTop) })
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

/**
 * Moves the vertices from the current layer to the temporary crop storage
 */
function copySelectedRegion(): void {
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
                    point[0] > ((selectionRectTopLeft.x / PAINT_CANVAS.width) * 2) - 1
                    && point[0] < ((selectionRectBotRight.x / PAINT_CANVAS.width) * 2) - 1
                    && point[1] > ((selectionRectBotRight.y / PAINT_CANVAS.height) * 2) - 1
                    && point[1] < ((selectionRectTopLeft.y / PAINT_CANVAS.height) * 2) - 1
                ) {
                    // Calculating the bounding rectangle of the vertices
                    // this gives the illusion of the line being cropped
                    // without the bounding rect, the copied vertices will
                    // keep their rounded edges even if that falls out of
                    // the copied region.
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

/**
 * Moves the region being cropped with delta
 * @param delta the distance the region should more in x and y
 * @returns 
 */
function moveCopiedRegion(delta: Point2D) {
    // go over the vertices of the current layer
    const currentLayer = getCurrentLayer();
    const croppingLayer = StateManager.getInstance().getState('cropping-layer');
    if (!currentLayer || !croppingLayer)
        return;

    croppingLayer.shapes.forEach((shape: Shape) => {
        for (let i = 0; i < shape.vertexData.length; i += 2) {
            shape.vertexData[i] += delta.x / PAINT_CANVAS.width * 2;
            shape.vertexData[i + 1] += delta.y / PAINT_CANVAS.height * 2;
        }
        shape.boundingRectData[0] += delta.x;
        shape.boundingRectData[1] += delta.y;
    });

    const selectionRectPos = StateManager.getInstance().getState('selection-rect-pos');
    StateManager.getInstance().setState('selection-rect-pos', { x: selectionRectPos.x + delta.x, y: selectionRectPos.y - delta.y })
    StateManager.getInstance().setState('cropping-layer', croppingLayer);
}

/**
 * Moves the selected vertices from the temporary crop storage to the current layer
 * The current layer doesn't have to be the same as the layer the vertices were cropped from
 * @returns 
 */
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

/**
 * Deletes the shapes it passes over
 * @param pos 
 * @returns 
 */
function erase(pos: Point2D) {
    const currentLayer = getCurrentLayer();
    if (!currentLayer)
        return;

    const brushSize = StateManager.getInstance().getState('brush-size') / PAINT_CANVAS.width;
    const posClip = MV.vec2((2 * ((pos.x - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - pos.y + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1);

    currentLayer.shapes = currentLayer.shapes.filter((shape) => {
        for (let i = 0; i < shape.vertexData.length; i += 2) {
            if (findLinearDistance(shape.vertexData.slice(i, i + 2), posClip) <= brushSize) {
                return false;
            }

            return true;
        }
    });
}

/**
 * @param pos 
 * @returns 
 */
function freeDraw(pos: Point2D) {
    const newLine = StateManager.getInstance().getState('new-line');
    const currentLayer = getCurrentLayer();
    if (!currentLayer)
        return;

    let newVertex = MV.vec2((2 * ((pos.x - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - pos.y + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1);
    const newColor = MV.vec4(...StateManager.getInstance().getState('picked-color'));
    const brushSize = StateManager.getInstance().getState('brush-size');
    const bindingRect = [0, 0, PAINT_CANVAS.width, PAINT_CANVAS.height];
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

/**
 * Recursively adds a point at the middle of the straight line connecting two points
 * @param a The first point
 * @param b The second point
 * @param allPoints The array holding all the added points
 */
function addMidPoint(a: number[], b: number[], allPoints: number[][]) {
    const MAX_ALLOWD_DISTANCE_BTWN_PTS = 0.01;
    const distance = findLinearDistance(a, b);

    if (distance > MAX_ALLOWD_DISTANCE_BTWN_PTS) {
        const c = findMidPoint(a, b);
        allPoints.unshift(c);
        addMidPoint(a, c, allPoints);
        addMidPoint(c, b, allPoints);
    }
}

/**
 * Finds the mid point of the straight line connecting two points
 * @param a The first point
 * @param b The second point
 */
function findMidPoint(a: number[], b: number[]): number[] {
    return MV.vec2((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
}

/**
 * Finds the length of the straight line connecting two points
 * @param a The first point
 * @param b The second point
 * @returns 
 */
function findLinearDistance(a: number[], b: number[]): number {
    const dx = Math.abs(a[0] - b[0]);
    const dy = Math.abs(a[1] - b[1]);
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Draws a rectangle whose top left corner is at pos
 * @param pos 
 * @param size 
 */
function drawRectangle(pos: Point2D, size: Size2D) {
    const currentLayer = getCurrentLayer();
    const newColor = MV.vec4(...StateManager.getInstance().getState('picked-color'));
    const brushSize = StateManager.getInstance().getState('brush-size');
    const bindingRect = [0, 0, PAINT_CANVAS.width, PAINT_CANVAS.height];

    const t1: number[] = MV.vec2((2 * ((pos.x - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - pos.y + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1);

    const t2: number[] = MV.vec2((2 * (((pos.x + size.w) - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - pos.y + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1);

    const t3: number[] = MV.vec2((2 * ((pos.x - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - (pos.y + size.h) + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1);

    const t4: number[] = MV.vec2((2 * (((pos.x + size.w) - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - (pos.y + size.h) + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1);

    const newShape: Shape = {
        vertexData: [...t1, ...t2, ...t4, ...t3],
        colorData: [...newColor, ...newColor, ...newColor, ...newColor],
        boundingRectData: [...bindingRect, ...bindingRect, ...bindingRect, ...bindingRect],
        brushSize: [brushSize, brushSize, brushSize, brushSize],
        type: 'nofill-rectangle',
    }

    currentLayer.shapes.unshift(newShape);
}

/**
 * Resizes the latest drawn rectangle
 * @param delta 
 */
function resizeRectangle(delta: Point2D) {
    // get the last shape (which will be a rectangle)
    // change its size
    const currentLayer = getCurrentLayer();

    // second vertex x
    currentLayer.shapes[0].vertexData[2] += delta.x / PAINT_CANVAS.width * 2;

    // third vertex x,y
    currentLayer.shapes[0].vertexData[4] += delta.x / PAINT_CANVAS.width * 2;
    currentLayer.shapes[0].vertexData[5] += delta.y / PAINT_CANVAS.height * 2;

    // forth vertex y
    currentLayer.shapes[0].vertexData[7] += delta.y / PAINT_CANVAS.height * 2;
}

/**
 * Solidifies the currently being drawn rectangle
 */
function finalizeRectangle() {
    const currentLayer = getCurrentLayer();
    currentLayer.shapes[0].type = 'rectangle';
}

/**
 * Draws a triangle whose top left corner is at pos
 * @param pos 
 * @param size 
 */
function drawTriangle(pos: Point2D, size: Size2D) {
    const currentLayer = getCurrentLayer();
    const newColor = MV.vec4(...StateManager.getInstance().getState('picked-color'));
    const brushSize = StateManager.getInstance().getState('brush-size');
    const bindingRect = [0, 0, PAINT_CANVAS.width, PAINT_CANVAS.height];

    const t1: number[] = MV.vec2((2 * ((pos.x - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - pos.y + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1);

    const t2: number[] = MV.vec2((2 * (((pos.x + size.w / 2) - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - (pos.y + size.h) + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1);

    const t3: number[] = MV.vec2((2 * (((pos.x - size.w / 2) - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - (pos.y + size.h) + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1);

    const newShape: Shape = {
        vertexData: [...t2, ...t3, ...t1],
        colorData: [...newColor, ...newColor, ...newColor],
        boundingRectData: [...bindingRect, ...bindingRect, ...bindingRect],
        brushSize: [brushSize, brushSize, brushSize],
        type: 'nofill-triangle',
    }

    currentLayer.shapes.unshift(newShape);
}

/**
 * Resizes the latest drawn triangle
 * @param delta 
 */
function resizeTriangle(delta: Point2D) {
    // get the last shape (which will be a triangle)
    // change its size
    const currentLayer = getCurrentLayer();

    // second vertex x,y
    currentLayer.shapes[0].vertexData[2] += delta.x / PAINT_CANVAS.width * 2;
    currentLayer.shapes[0].vertexData[3] += delta.y / PAINT_CANVAS.height * 2;

    // third vertex x,y
    currentLayer.shapes[0].vertexData[4] -= delta.x / PAINT_CANVAS.width * 2;
    currentLayer.shapes[0].vertexData[5] += delta.y / PAINT_CANVAS.height * 2;
}

/**
 * Solidifies the currently being drawn triangle
 */
function finalizeTriangle() {
    const currentLayer = getCurrentLayer();
    currentLayer.shapes[0].type = 'triangle';
}

/**
 * Draws an elipse whose top left corner is at pos
 * @param pos 
 * @param size 
 */
function drawElipse(pos: Point2D, size: Size2D) {
    const center: number[] = MV.vec2((2 * ((pos.x - PAINT_CANVAS.offsetLeft) / PAINT_CANVAS.width) - 1),
        2 * ((PAINT_CANVAS.height - pos.y + PAINT_CANVAS.offsetTop) / PAINT_CANVAS.height) - 1); // center
    const currentLayer = getCurrentLayer();
    const newColor: number[] = MV.vec4(...StateManager.getInstance().getState('picked-color'));
    const brushSize: number = StateManager.getInstance().getState('brush-size');
    const bindingRect: number[] = [0, 0, PAINT_CANVAS.width, PAINT_CANVAS.height];

    const newShape: Shape = {
        vertexData: [],
        colorData: [],
        boundingRectData: [],
        brushSize: [],
        type: 'nofill-elipse',
        center: [...center],
        size: { ...size },
    }

    // according to ellipse equation
    const radiusX = Math.abs(size.w / PAINT_CANVAS.width);
    const radiusY = Math.abs(size.h / PAINT_CANVAS.height);

    for (let i = 0; i < 32; i++) {
        const t: number[] = MV.vec2(center[0] + radiusX * Math.cos(i * Math.PI / 16), center[1] + radiusY * Math.sin(i * Math.PI / 16));
        newShape.vertexData.push(...t);
        newShape.colorData.push(...newColor);
        newShape.boundingRectData.push(...bindingRect);
        newShape.brushSize.push(brushSize);
    }

    currentLayer.shapes.unshift(newShape);
}

/**
 * Resizes the latest drawn elipse
 * @param delta 
 */
function resizeElipse(delta: { x: number, y: number }) {
    // get the last shape (which will be an elipse)
    // change its size
    const currentLayer = getCurrentLayer();
    const center = currentLayer.shapes[0].center;
    const curSize = currentLayer.shapes[0].size;
    if (!center || !curSize)
        return;

    const updatedVertexData: number[] = []
    const newSize = { w: curSize.w + delta.x * 2, h: curSize.h + delta.y * 2 };
    // according to ellipse equation
    const radiusX = Math.abs(newSize.w / PAINT_CANVAS.width);
    const radiusY = Math.abs(newSize.h / PAINT_CANVAS.height);

    for (let i = 0; i < 32; i++) {
        const t: number[] = MV.vec2(center[0] + radiusX * Math.cos(i * Math.PI / 16), center[1] + radiusY * Math.sin(i * Math.PI / 16));
        updatedVertexData.push(...t);
    }

    currentLayer.shapes[0].vertexData = [...updatedVertexData];
    currentLayer.shapes[0].size = { ...newSize };
}

/**
 * Solidifies the currently being drawn elipse
 */
function finalizeElipse() {
    const currentLayer = getCurrentLayer();
    currentLayer.shapes[0].type = 'elipse';
}

/**
 * Stores the current state of the program in a timeline
 */
function updateTimeline() {
    const layers: Layer[] = StateManager.getInstance().getState('layers');
    const curTimelineNode = StateManager.getInstance().getState('cur-timeline-node');
    let timeline: Layer[][] = StateManager.getInstance().getState('timeline');

    // If we're not at the most recent point of the timeline, delete the future!
    if (curTimelineNode !== timeline.length - 1) {
        timeline = timeline.slice(0, curTimelineNode + 1);
    }

    timeline.push(JSON.parse(JSON.stringify(layers)));
    StateManager.getInstance().setState('cur-timeline-node', timeline.length - 1);
    StateManager.getInstance().setState('timeline', timeline);
}

/**
 * Gets the latest selected layer
 */
function getCurrentLayer(): Layer {
    const currentLayerId = StateManager.getInstance().getState('selectedLayer');
    return StateManager.getInstance().getState('layers').find((layer: Layer) => layer.id === currentLayerId);
}
