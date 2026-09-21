import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createNoise4D } from 'simplex-noise';
import { GraduationCap } from 'lucide-react';

interface AIVoiceVisualizerProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number; // 0 to 1
  className?: string;
}

export const AIVoiceVisualizer: React.FC<AIVoiceVisualizerProps> = ({
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioLevelRef = useRef(audioLevel);
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
    isListeningRef.current = isListening;
    isSpeakingRef.current = isSpeaking;
  }, [audioLevel, isListening, isSpeaking]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lighting with wine / maroon ambiance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const winePointLight1 = new THREE.PointLight(0x800020, 2.5, 50);
    winePointLight1.position.set(8, 8, 10);
    scene.add(winePointLight1);

    const winePointLight2 = new THREE.PointLight(0x58051e, 3, 50);
    winePointLight2.position.set(-10, -4, -2);
    scene.add(winePointLight2);

    const accentLight = new THREE.PointLight(0xe6ca9e, 1.2, 30);
    accentLight.position.set(0, 0, 5);
    scene.add(accentLight);

    // 3. Torus geometries
    const geometries = [
      new THREE.TorusGeometry(1.2, 0.35, 32, 100),
      new THREE.TorusGeometry(1.2, 0.35, 32, 100),
      new THREE.TorusGeometry(1.2, 0.35, 32, 100),
    ];

    // Store original positions for deformation
    const originalPositions = geometries.map((geo) =>
      Float32Array.from(geo.attributes.position.array)
    );

    // Initialize vertex colors
    geometries.forEach((geometry) => {
      const count = geometry.attributes.position.count;
      const colors = new Float32Array(count * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    });

    // Wine / maroon materials with rich metallic sheen
    const materials = [
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.35,
        metalness: 0.65,
        transparent: true,
        opacity: 0.92,
        wireframe: false,
      }),
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.45,
        metalness: 0.5,
        transparent: true,
        opacity: 0.85,
        wireframe: false,
      }),
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.3,
        metalness: 0.7,
        transparent: true,
        opacity: 0.78,
        wireframe: false,
      }),
    ];

    const meshes = geometries.map((g, i) => new THREE.Mesh(g, materials[i]));
    meshes.forEach((mesh) => scene.add(mesh));

    // Simplex noise instance
    const noise4D = createNoise4D();
    let time = 0;
    let animationFrameId: number;

    // Palette Colors: Wine / Maroon / Crimson / Gold Accent
    const baseColor = new THREE.Color('#58051E');     // Deep Burgundy Wine
    const midColor = new THREE.Color('#800020');      // Maroon
    const activeColor = new THREE.Color('#9E1B42');   // Bright Rose Wine
    const highlightColor = new THREE.Color('#E6CA9E');// Golden Highlight

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const dynamicLevel = audioLevelRef.current;
      const isLive = isListeningRef.current || isSpeakingRef.current;

      // Base idle pulse vs active voice wave displacement
      const baseDisplacement = isLive ? 0.18 + dynamicLevel * 0.45 : 0.08;
      const speed = isLive ? 0.02 + dynamicLevel * 0.05 : 0.012;

      time += speed;

      meshes.forEach((mesh, index) => {
        mesh.rotation.x = time * (0.3 + index * 0.1);
        mesh.rotation.y = time * (0.4 - index * 0.15);
        mesh.rotation.z = time * 0.2;

        const geometry = geometries[index];
        const positions = geometry.attributes.position.array as Float32Array;
        const orig = originalPositions[index];
        const colors = geometry.attributes.color.array as Float32Array;
        const count = geometry.attributes.position.count;

        const vertex = new THREE.Vector3();
        const baseVec = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          baseVec.set(orig[idx], orig[idx + 1], orig[idx + 2]);

          const noiseVal = noise4D(
            baseVec.x * 1.2,
            baseVec.y * 1.2,
            baseVec.z * 1.2,
            time * 0.8 + index
          );

          const displacement = baseDisplacement * noiseVal * (1 + dynamicLevel * 2.2);
          vertex.copy(baseVec).multiplyScalar(1 + displacement * 0.35);

          positions[idx] = vertex.x;
          positions[idx + 1] = vertex.y;
          positions[idx + 2] = vertex.z;

          // Color gradient shifting based on noise & sound activity
          const factor = THREE.MathUtils.clamp(
            Math.abs(displacement) / Math.max(0.01, baseDisplacement),
            0,
            1
          );

          let blendedColor: THREE.Color;
          if (dynamicLevel > 0.4) {
            blendedColor = activeColor.clone().lerp(highlightColor, factor);
          } else if (isLive) {
            blendedColor = baseColor.clone().lerp(midColor, factor);
          } else {
            blendedColor = baseColor.clone().lerp(activeColor, factor * 0.6);
          }

          colors[idx] = blendedColor.r;
          colors[idx + 1] = blendedColor.g;
          colors[idx + 2] = blendedColor.b;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 320;
      const newH = container.clientHeight || 320;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* 3D Torus Wave Canvas Container */}
      <div ref={mountRef} className="w-full h-full min-h-[260px] flex items-center justify-center" />

      {/* Center White Graduation Cap with Soft Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          {/* Ambient Glow ring */}
          <div
            className={`absolute w-20 h-20 rounded-full transition-all duration-300 blur-xl ${
              isSpeaking
                ? 'bg-[#E6CA9E]/50 scale-150'
                : isListening
                ? 'bg-[#9E1B42]/50 scale-125'
                : 'bg-[#58051E]/40 scale-100'
            }`}
          />

          {/* Central White Graduation Cap Badge */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-2xl border-2 border-white/90 flex items-center justify-center transform transition-transform duration-200">
            <GraduationCap
              className={`w-9 h-9 text-[#58051E] transition-all duration-200 ${
                isSpeaking
                  ? 'scale-110 drop-shadow-[0_0_8px_rgba(230,202,158,0.8)]'
                  : isListening
                  ? 'scale-105'
                  : 'scale-100'
              }`}
              strokeWidth={2.4}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIVoiceVisualizer;
