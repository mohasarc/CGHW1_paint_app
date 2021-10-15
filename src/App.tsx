import "./styles.css";
import { Container, Grid } from "@mui/material";
import { useEffect } from "react";
import * as MV from './Common/MV';
import * as INIT from './Common/initShaders';
import * as UTILS from './Common/webgl-utils';
import { fragmentShader, vertexShader } from './shaders';
import { StateManager } from "./util/StateManager";

var canvas: any;
var gl: any;

var maxNumTriangles = 200;  
var maxNumVertices  = 3 * maxNumTriangles;
var index = 0;

var colors = [
  MV.vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
  MV.vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
  MV.vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
  MV.vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
  MV.vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
  MV.vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
  MV.vec4( 0.0, 1.0, 1.0, 1.0)   // cyan
];

function init() {

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
  var program = INIT.initShaders( gl, vertexShader, fragmentShader );
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
  
  //canvas.addEventListener("click", function(){
  canvas.addEventListener("click", function(event: any){
    if (!canvas)
      throw new Error('No Canvas!');
      
      console.log('Canvas clicked!!');

      gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
      var t = MV.vec2(2*event.clientX/canvas.width-1, 
           2*(canvas.height-event.clientY)/canvas.height-1);
      gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, MV.flatten(t));

      gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
      t = MV.vec4(colors[index%7]);
      gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, MV.flatten(t));
      index++;
  } );


  render();


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

function render() {
  
  gl.clear( gl.COLOR_BUFFER_BIT );
  gl.drawArrays( gl.TRIANGLE_STRIP, 0, index );
  
  console.log('rerendering');

  requestAnimationFrame(render);
}

export default function App() {

  useEffect(init)

  return (
    <div className="App">
      <Container maxWidth="lg" > 
        <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
          
          <Grid item xs={12} sm={6} md={2}>
            <h2>Start editing to see some magic happen!</h2>
          </Grid>

          <Grid item xs={12} sm={6} md={8}>
            <canvas id={'macanvas'}  width = { 512 } height = { 512 }/>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <h1>Hello CodeSandbox</h1>
          </Grid>
        
        </Grid>
      </Container>
    </div>
  );
}
