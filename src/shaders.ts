export const vertexShader = `
    attribute vec4 vPosition;
    attribute vec4 vColor;

    varying vec4 fColor;

    void
    main()
    {
        gl_Position = vPosition;
        fColor = vColor;
    }
`;

export const fragmentShader = `
    precision mediump float;

    varying vec4 fColor;
    void
    main()
    {
        gl_FragColor = fColor;
    }
`;

export const squaremShaders = {
    vertexShader: `
        attribute vec4 vPosition;
        attribute vec4 vColor;
        
        varying vec4 fColor;
        
        void
        main()
        {
            gl_Position = vPosition;
            fColor = vColor;
            gl_PointSize = 20.0;
        }
    `,
    fragmentShader: `
        // src = https://www.desultoryquest.com/blog/drawing-anti-aliased-circular-points-using-opengl-slash-webgl/
        precision mediump float;

        varying vec4 fColor;

        void
        main()
        {
            float r = 0.0, delta = 0.0, alpha = 1.0;
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            r = dot(cxy, cxy);
            if (r > 1.0) {
                discard;
            }
            gl_FragColor = fColor * (alpha);
        }    
    `,
}