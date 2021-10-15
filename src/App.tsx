import "./styles.css";
import { Container, Grid } from "@mui/material";
import { useEffect } from "react";
import * as MV from './Common/MV';
import * as INIT from './Common/initShaders';
import * as UTILS from './Common/webgl-utils';
import { fragmentShader, vertexShader, squaremShaders } from './shaders';
import { StateManager } from "./util/StateManager";
var colors = [
  MV.vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
  MV.vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
  MV.vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
  MV.vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
  MV.vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
  MV.vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
  MV.vec4( 0.0, 1.0, 1.0, 1.0 ),   // cyan
  MV.vec4( 1.0, 1.0, 1.0, 1.0 )   // white
];

function initColorPicker() {
  const colorPickerCanvas: any = document.getElementById('color-picker');
  if (!colorPickerCanvas) throw new Error('Couldn\'t find the canvas');
  
  let gl = UTILS.WebGLUtils.setupWebGL(colorPickerCanvas, {preserveDrawingBuffer: true});
  if ( !gl ) throw new Error( "WebGL isn't available" );
  
  gl.viewport( 0, 0, colorPickerCanvas.width, colorPickerCanvas.height );
  gl.clearColor( 0.8, 0.8, 0.8, 1.0 );

  let program = INIT.initShaders( gl, vertexShader, fragmentShader );
  gl.useProgram( program );
  
  let vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 8*4, gl.STATIC_DRAW);
  var rect = [MV.vec2(-1, 1), MV.vec2(1, 1), MV.vec2(1, -1), MV.vec2(-1, -1)];
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, MV.flatten(rect));

  let vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);
  
  let cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 16*4, gl.STATIC_DRAW);
  let rectColors = [MV.vec4(colors[1]), MV.vec4(colors[3]), MV.vec4(colors[4]), MV.vec4(colors[2])];
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, MV.flatten(rectColors));

  let vColor = gl.getAttribLocation( program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);
  
  render();

  colorPickerCanvas.addEventListener("click", (event: any) => {
    var clickedPos = MV.vec2(event.clientX - colorPickerCanvas.offsetLeft, 
    colorPickerCanvas.height-event.clientY + colorPickerCanvas.offsetTop);

    let pixel = new Uint8Array(4);
    gl.readPixels(clickedPos[0], clickedPos[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    StateManager.getInstance().setState('picked-color', [pixel[0]/255, pixel[1]/255, pixel[2]/255, pixel[3]/255]);
  });

  function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLE_FAN, 0, 4 );
  }
}

function init() {
  let canvas: any;
  let gl: any;

  let maxNumTriangles = 20000;  
  let maxNumVertices  = 3 * maxNumTriangles;
  let index = 0;
  let redraw = false;

  canvas = document.getElementById('macanvas');
 
  if (!canvas)
    throw new Error('Couldn\'t create the canvas');
  
  gl = UTILS.WebGLUtils.setupWebGL(canvas, null);
  if ( !gl ) { alert( "WebGL isn't available" ); }
  
  gl.viewport( 0, 0, canvas.width, canvas.height );
  gl.clearColor( 0.8, 0.8, 0.8, 1.0 );

  //
  //  Load shaders and initialize attribute buffers
  //
  var program = INIT.initShaders( gl, squaremShaders.vertexShader, squaremShaders.fragmentShader );
  gl.useProgram( program );
  
  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW);
  
  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);
  
  var cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW);
  
  var vColor = gl.getAttribLocation( program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);

  canvas.addEventListener("mousedown", function(event: any){
    redraw = true;
  });

  canvas.addEventListener("mouseup", function(event: any){
    redraw = false;
  });
  //canvas.addEventListener("mousedown", function(){
  canvas.addEventListener("mousemove", function(event: any){

    if(redraw) {
      gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );

      var t = MV.vec2((2*((event.clientX - canvas.offsetLeft)/canvas.width) - 1), 
        2*((canvas.height-event.clientY + canvas.offsetTop)/canvas.height)-1);
      
      gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, MV.flatten(t));

      gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
      t = MV.vec4(...StateManager.getInstance().getState('picked-color'));
      gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, MV.flatten(t));
      index++;
    }
  } );


  render();

  function render() {
    
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.POINTS, 0, index );

    requestAnimationFrame(render);
  }

  // StateManager.getInstance().setState('hi', 5);
  // StateManager.getInstance().subscribe('hi', () => {
  //   let newState = StateManager.getInstance().getState('hi');
  //   console.log('the first subscriber: ', newState);
  // });
  
  // StateManager.getInstance().subscribe('hi', () => {
  //   let newState = StateManager.getInstance().getState('hi');
  //   console.log('the 2nd subscriber: ', newState);
  // });

  // setInterval(() => {
  //   StateManager.getInstance().setState('hi', Math.random()*500) ;
  // }, 1000)

}

export default function App() {

  // Initial value
  StateManager.getInstance().setState('picked-color', [0, 0, 0, 0]);

  useEffect(initColorPicker);
  useEffect(init);

  return (
    <div className="App">
      <Container maxWidth="lg" > 
        <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
          
          <Grid item xs={12} sm={6} md={2}>
            <h2>Painter :D</h2>
          </Grid>

          <Grid item xs={12} sm={6} md={8}>
            <canvas id={'macanvas'}  width = { 512 } height = { 512 }/>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <canvas id={'color-picker'}/>
          </Grid>
        
        </Grid>
      </Container>
    </div>
  );
}
