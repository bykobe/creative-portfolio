"use client"

import { shaderMaterial } from "@react-three/drei"
import { extend, type ThreeElement, useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { DataTexture, FloatType, NearestFilter, RGBAFormat, Texture, Vector2 } from "three"
import { type Pointer, WebglImage } from "../webgl-image/webgl-image"
import { WebglVideo } from "../webgl-video/webgl-video"

declare module "@react-three/fiber" {
    interface ThreeElements {
        pixelMediaMat: ThreeElement<typeof PixelMediaMat>
    }
}

const vertexShader = /* glsl */ `
    precision highp float;
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const fragmentShader = /* glsl */ `
    precision highp float;
    varying vec2 vUv;

    uniform sampler2D uMap;
    uniform sampler2D uGrid;
    uniform float uStrength;
    uniform float uAberration;
    uniform float uGrey; // 0 = full colour, 1 = fully greyscale

    void main() {
        vec2 offset = texture2D(uGrid, vUv).rg * uStrength;
        vec2 uv = vUv - offset;
        vec2 shift = offset * uAberration;

        vec3 color = vec3(
            texture2D(uMap, uv - shift).r,
            texture2D(uMap, uv).g,
            texture2D(uMap, uv + shift).b
        );

        // greyscale, blended in by uGrey so it can fade rather than snap
        float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color = mix(color, vec3(luma), uGrey);

        gl_FragColor = vec4(color, 1.0);
    }
`

const PixelMediaMat = shaderMaterial(
    {
        uMap: new Texture(),
        uGrid: new Texture(),
        uStrength: 0.5,
        uAberration: 0.5,
        uGrey: 0,
    },
    vertexShader,
    fragmentShader,
)

extend({ PixelMediaMat })

const REFERENCE_FPS = 60

export type PixelEffectProps = {
    gridSize?: number
    interactionRadius?: number
    strength?: number
    aberration?: number
    trail?: number
    segments?: number
    webglEnabled?: boolean
    postProcessing?: boolean
    /** Fade the image to greyscale while the cursor is over it. Off by default. */
    greyscale?: boolean
    className?: string
}

type PixelMediaMaterialProps = {
    map: Texture
    pointer: Pointer
    greyscale: boolean
} & Required<
    Pick<PixelEffectProps, "gridSize" | "interactionRadius" | "strength" | "aberration" | "trail">
>

type PixelMediaImageProps = PixelEffectProps & {
    type?: "image"
    src: string
    alt: string
} & Omit<React.ComponentPropsWithoutRef<"img">, "src" | "alt">

type PixelMediaVideoProps = PixelEffectProps & {
    type: "video"
    src: string
} & Omit<React.ComponentPropsWithoutRef<"video">, "src">

export type PixelMediaProps = PixelMediaImageProps | PixelMediaVideoProps

function PixelMediaMaterial({
    map,
    pointer,
    gridSize,
    interactionRadius,
    strength,
    aberration,
    trail,
    greyscale,
}: PixelMediaMaterialProps) {
    const ref = useRef<InstanceType<typeof PixelMediaMat>>(null)
    const previous = useMemo(() => new Vector2(0.5, 0.5), [])
    const wasHovering = useRef(false)
    const grey = useRef(0) // current greyscale amount, eased toward its target every frame

    const grid = useMemo(() => {
        const data = new Float32Array(gridSize * gridSize * 4)
        const texture = new DataTexture(data, gridSize, gridSize, RGBAFormat, FloatType)
        texture.magFilter = NearestFilter
        texture.minFilter = NearestFilter
        texture.needsUpdate = true
        return { texture, data }
    }, [gridSize])

    useFrame((_, delta) => {
        const material = ref.current
        if (!material) return

        const { data } = grid

        if (pointer.hover > 0 && !wasHovering.current) previous.copy(pointer.texUv)
        wasHovering.current = pointer.hover > 0

        const velocityX = (pointer.texUv.x - previous.x) * pointer.hover
        const velocityY = (pointer.texUv.y - previous.y) * pointer.hover
        previous.copy(pointer.texUv)

        const fade = trail ** (delta * REFERENCE_FPS)
        const cursorColumn = pointer.texUv.x * gridSize
        const cursorRow = pointer.texUv.y * gridSize

        for (let row = 0; row < gridSize; row++) {
            for (let column = 0; column < gridSize; column++) {
                const index = (row * gridSize + column) * 4
                const distance = Math.hypot(column - cursorColumn, row - cursorRow)
                const falloff = Math.max(0, 1 - distance / interactionRadius)
                data[index] = data[index] * fade + velocityX * falloff
                data[index + 1] = data[index + 1] * fade + velocityY * falloff
            }
        }

        // ease toward grey while hovered (or back to colour), independent of how pointer.hover behaves
        const greyTarget = greyscale ? Math.min(1, pointer.hover) : 0
        grey.current += (greyTarget - grey.current) * (1 - Math.exp(-delta * 10))

        grid.texture.needsUpdate = true
        material.uGrey = grey.current
        material.uMap = map
        material.uGrid = grid.texture
        material.uStrength = strength
        material.uAberration = aberration
    })

    return (
        <pixelMediaMat
            ref={ref}
            key={PixelMediaMat.key}
            uMap={map}
            uGrid={grid.texture}
            transparent
        />
    )
}

export function PixelMedia(props: PixelMediaProps) {
    const {
        gridSize = 22,
        interactionRadius = 4,
        strength = 1.65,
        aberration = 0.25,
        trail = 0.93,
        segments = 1,
        webglEnabled = true,
        greyscale = false,
        ...rest
    } = props

    // The pixel displacement is a fragment-only shader, so the same material
    // runs on both the image and video primitives (they share the WebGL plane).
    const material = (map: Texture, pointer: Pointer) => (
        <PixelMediaMaterial
            map={map}
            pointer={pointer}
            gridSize={gridSize}
            interactionRadius={interactionRadius}
            strength={strength}
            aberration={aberration}
            trail={trail}
            greyscale={greyscale}
        />
    )

    if (rest.type === "video") {
        const { type: _type, ...videoProps } = rest
        return (
            <WebglVideo
                segments={segments}
                webglEnabled={webglEnabled}
                material={material}
                {...videoProps}
            />
        )
    }

    const { type: _type, ...imageProps } = rest
    return (
        <WebglImage
            segments={segments}
            webglEnabled={webglEnabled}
            material={material}
            {...imageProps}
        />
    )
}
