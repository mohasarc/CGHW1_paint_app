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
