/**
 * A wrapper for passing an attribute buffer to vertiex shader
 * @param gl 
 * @param program 
 * @param attributeName 
 * @param buffer 
 * @param size 
 * @param vSize 
 * @param type 
 */
export function addAttribute(gl: WebGLRenderingContext, program: any, attributeName: string, buffer: WebGLBuffer, size: number, vSize: number, type: number) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, 4 * vSize * size, gl.STATIC_DRAW);

  let attributePos = gl.getAttribLocation(program, attributeName);
  gl.vertexAttribPointer(attributePos, vSize, type, false, 0, 0);
  gl.enableVertexAttribArray(attributePos);
}

/**
 * Taken from https://convertingcolors.com/blog/article/convert_hex_to_rgb_with_javascript.html
 */
export function convertToRGB (hexColor: string){
    if(hexColor.length != 6){
        throw "Only six-digit hex colors are allowed.";
    }

    var aRgbHex = hexColor.match(/.{1,2}/g);
    if (!aRgbHex)
        throw new Error('Corrupt hex');

    var aRgb = [
        parseInt(aRgbHex[0], 16),
        parseInt(aRgbHex[1], 16),
        parseInt(aRgbHex[2], 16)
    ];
    return aRgb;
}
