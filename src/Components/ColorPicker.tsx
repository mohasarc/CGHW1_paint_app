import { useEffect } from "react";
import * as MV from '../Common/MV';
import * as INIT from '../Common/initShaders';
import * as UTILS from '../Common/webgl-utils';
import { Grid, Card, CardHeader, CardContent, Button, styled, ButtonProps } from '@mui/material';

import { fragmentShader, vertexShader } from '../shaders';
import { StateManager } from "../util/StateManager";
import { addAttribute, convertToRGB } from '../util/webglHelpers';

const colors = [
    MV.vec4(0.0, 0.0, 0.0, 1.0),  // black
    MV.vec4(1.0, 0.0, 0.0, 1.0),  // red
    MV.vec4(1.0, 1.0, 0.0, 1.0),  // yellow
    MV.vec4(0.0, 1.0, 0.0, 1.0),  // green
    MV.vec4(0.0, 1.0, 1.0, 1.0),  // cyan
    MV.vec4(0.0, 0.0, 1.0, 1.0),  // blue
    MV.vec4(1.0, 0.0, 1.0, 1.0),  // magenta
    MV.vec4(1.0, 1.0, 1.0, 1.0)   // white
];

export default function ColorPicker() {
    StateManager.getInstance().setState('hue-picked', [0, 1, 1, 1]);
    StateManager.getInstance().setState('hue-pos', 0.5);

    useEffect(initSaturationCanvas);
    useEffect(initHueCanvas);
    const preferredColors = ['#41b96c', '#06c1d9', '#fed37a', '#e45b06', '#06486c', '#534430', '#eb4956', '#b838ed'];
    
    return (
        <div>
            <Card sx={{ width: 350 }}>
                <CardHeader title={'Color Picker'} titleTypographyProps={{variant:'body2', align: 'center', color: 'common.white' }} style={{backgroundColor: '#323638'}} />
                <CardContent style={{backgroundColor: '#3b4245'}}>
                    <canvas id={'saturation-canvas'} />
                    <canvas id={'hue-canvas'} style={{height: 25, width: 300, paddingBottom: 20}}/>
                    <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                        {
                            preferredColors.map((prefColor) => {
                                return (
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Button
                                            id={prefColor}
                                            variant="contained"
                                            style={{
                                                borderRadius: 100,
                                                backgroundColor: prefColor,
                                                padding: "10px 20px",
                                            }}
                                            onClick={handlePreferredColorsButtonEvent}
                                        />
                                    </Grid>
                                );
                            })
                        }
                    </Grid>
                </CardContent>
            </Card>
        </div>
    );
}

function handlePreferredColorsButtonEvent(event: any) {
    const color = convertToRGB(event.target.id.substr(1));
    StateManager.getInstance().setState('picked-color', [...color.map(cc => cc/255), 1]);
}

function initHueCanvas() {
    /******************* INIT WEBGL RENDERING CONTEXT ******************/
    const hueCanvas: any = document.getElementById('hue-canvas');
    if (!hueCanvas) throw new Error('Couldn\'t find the canvas');

    let gl: WebGLRenderingContext = UTILS.WebGLUtils.setupWebGL(hueCanvas, { preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL isn't available");

    gl.viewport(0, 0, hueCanvas.width, hueCanvas.height);
    gl.clearColor(254/255, 254/255, 204/255, 1.0);

    let program = INIT.initShaders(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    let vertexBuffer = gl.createBuffer();
    if (vertexBuffer)
        addAttribute(gl, program, 'vPosition', vertexBuffer, 14, 2, gl.FLOAT);

    let colorBuffer = gl.createBuffer();
    if (colorBuffer)
        addAttribute(gl, program, 'vColor', colorBuffer, 14, 4, gl.FLOAT);
    
    const rects = [];
    const rectsColors = [];
    for (let w = -1, i = 0; w < 1; w += 2/6, i++) {
        rects.push(MV.vec2(w, 1), MV.vec2(w, -1));
        rectsColors.push(MV.vec4(colors[i%6 + 1]), MV.vec4(colors[i%6 + 1]));
        
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, MV.flatten(rects));

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, MV.flatten(rectsColors));
    
    /*************************** INIT EVENTS ***************************/
    let pick = false;
    hueCanvas.addEventListener('mousedown', () => {
        pick = true;
    });

    hueCanvas.addEventListener('mouseup', () => {
        pick = false
    });

    hueCanvas.addEventListener("mousemove", (event: any) => {
        if (pick) {
            pickColor(event.clientX, event.clientY);
        }
    });

    hueCanvas.addEventListener('click', (event: any) => {
        pickColor(event.clientX, event.clientY);
    });
    
    function pickColor(pointerX: number, pointerY: number) {
        var clickedPos = MV.vec2(pointerX - hueCanvas.offsetLeft,
            hueCanvas.height - pointerY + hueCanvas.offsetTop);

        let pixel = new Uint8Array(4);
        gl.readPixels(clickedPos[0], clickedPos[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        StateManager.getInstance().setState('hue-picked', [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255, pixel[3] / 255]);
        StateManager.getInstance().setState('hue-pos', clickedPos[0]/hueCanvas.width);
        console.log('Hue-picked: ', StateManager.getInstance().getState('hue-picked'));
    }

    /***************************** RENDER ******************************/
    (function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 14);
    })();
}

function initSaturationCanvas() {
    /******************* INIT WEBGL RENDERING CONTEXT ******************/
    const saturationCanvas: any = document.getElementById('saturation-canvas');
    if (!saturationCanvas) throw new Error('Couldn\'t find the canvas');

    let gl: WebGLRenderingContext = UTILS.WebGLUtils.setupWebGL(saturationCanvas, { preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL isn't available");

    gl.viewport(0, 0, saturationCanvas.width, saturationCanvas.height);
    gl.clearColor(59/255, 66/255, 69/255, 1.0);

    let program = INIT.initShaders(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    let vertexBuffer = gl.createBuffer();
    if (vertexBuffer)
        addAttribute(gl, program, 'vPosition', vertexBuffer, 3, 2, gl.FLOAT);

    let colorBuffer = gl.createBuffer();
    if (colorBuffer)
        addAttribute(gl, program, 'vColor', colorBuffer, 3, 4, gl.FLOAT);

    /*************************** INIT EVENTS ***************************/
    saturationCanvas.addEventListener("click", (event: any) => {
        var clickedPos = MV.vec2(event.clientX - saturationCanvas.offsetLeft,
            saturationCanvas.height - event.clientY + saturationCanvas.offsetTop);

        let pixel = new Uint8Array(4);
        gl.readPixels(clickedPos[0], clickedPos[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        StateManager.getInstance().setState('picked-color', [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255, pixel[3] / 255]);
    });
    
    /***************************** RENDER ******************************/
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        let rectColors = [MV.vec4(colors[7]), MV.vec4(colors[0]), StateManager.getInstance().getState('hue-picked')];
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, MV.flatten(rectColors));

        let rect = [MV.vec2(-1, 1), MV.vec2(1, 1), MV.vec2(StateManager.getInstance().getState('hue-pos')*2-1, -1)];
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, MV.flatten(rect));
        
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 3);
    }

    StateManager.getInstance().subscribe('hue-picked', render);
    StateManager.getInstance().subscribe('hue-pos', render);
    render();
}
