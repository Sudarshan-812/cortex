"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const VERTEX_SRC = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 aspectUv = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) + 0.5;

  float t = uTime * 0.035;
  vec2 p = aspectUv * 2.4;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 0.8));
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) - 0.126 * t)
  );
  float f = fbm(p + 4.0 * r);

  vec3 paper  = vec3(0.980, 0.980, 0.976);
  vec3 gold   = vec3(0.631, 0.384, 0.027);
  vec3 bronze = vec3(0.471, 0.208, 0.059);
  vec3 ink    = vec3(0.110, 0.098, 0.090);

  vec3 col = mix(paper, gold, smoothstep(0.35, 0.78, f));
  col = mix(col, bronze, smoothstep(0.55, 0.92, r.x));
  col = mix(col, ink, smoothstep(0.8, 1.05, q.y) * 0.35);

  col = mix(paper, col, 0.22);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LandingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "uTime");
    const uResolution = gl.getUniformLocation(program, "uResolution");

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let width = 0;
    let height = 0;
    let rafId = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const renderFrame = (time: number) => {
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduceMotion) {
      renderFrame(0);
      return () => window.removeEventListener("resize", resize);
    }

    const start = performance.now();
    const tick = (now: number) => {
      renderFrame((now - start) * 0.001);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [reduceMotion]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ background: "var(--lp-bg)" }}
    >
      {/* Shader-driven flowing ink field - domain-warped fbm noise, continuous organic motion */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Paper grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Bottom vignette so content stays legible over the flow */}
      <div
        className="absolute inset-x-0 bottom-0 h-[32%] pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, var(--lp-bg))" }}
      />
    </div>
  );
}
