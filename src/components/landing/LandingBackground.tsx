"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export function LandingBackground() {
  const { scrollY } = useScroll();

  // Reduced parallax range so image always covers the fixed container
  const bgY = useTransform(scrollY, [0, 1200], ["0%", "-10%"]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <style>{`
        @keyframes kenburns-bg {
          0%   { scale: 1.0;  translate: 0%     0%;    }
          33%  { scale: 1.06; translate: -0.6%  0.3%;  }
          66%  { scale: 1.03; translate: 0.4%  -0.5%;  }
          100% { scale: 1.0;  translate: 0%     0%;    }
        }
      `}</style>

      {/* Landscape — Ken Burns + scroll parallax */}
      <motion.div
        style={{
          y: bgY,
          position: "absolute",
          top: "-15%",
          left: "-5%",
          width: "110%",
          height: "145%",
          backgroundImage: "url(/landscape.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center 45%",
          animation: "kenburns-bg 34s ease-in-out infinite",
        }}
      />

      {/* No gradient overlay here — cream is applied per-section so it scrolls with content, not the viewport */}
    </div>
  );
}
