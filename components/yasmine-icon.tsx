import { useMood } from "./mood-context"
import Image from "next/image"

export function YasmineIcon({ className = "w-8 h-8" }: { className?: string }) {
  const { currentMood } = useMood()

  // Define mood-based styling for Yasmine's expressions
  const getMoodStyling = (mood: any) => {
    if (!mood) {
      // Default happy expression
      return {
        filter: "brightness(1) saturate(1.1) hue-rotate(0deg)",
        transform: "scale(1)",
        opacity: "1"
      }
    }

    switch (mood.value) {
      case 5: // Sunny - Very happy and bright
        return {
          filter: "brightness(1.2) saturate(1.3) hue-rotate(5deg)",
          transform: "scale(1.05)",
          opacity: "1"
        }
      case 4: // Partly cloudy/Rainbow - Happy
        return {
          filter: "brightness(1.1) saturate(1.2) hue-rotate(2deg)",
          transform: "scale(1.02)",
          opacity: "1"
        }
      case 3: // Cloudy/Starry - Neutral
        return {
          filter: "brightness(1) saturate(1) hue-rotate(0deg)",
          transform: "scale(1)",
          opacity: "0.9"
        }
      case 2: // Rainy - Sad
        return {
          filter: "brightness(0.8) saturate(0.8) hue-rotate(-5deg)",
          transform: "scale(0.95)",
          opacity: "0.8"
        }
      case 1: // Stormy - Very sad
        return {
          filter: "brightness(0.7) saturate(0.7) hue-rotate(-10deg)",
          transform: "scale(0.9)",
          opacity: "0.7"
        }
      default:
        return {
          filter: "brightness(1) saturate(1.1) hue-rotate(0deg)",
          transform: "scale(1)",
          opacity: "1"
        }
    }
  }

  // Get mood-specific styling
  const moodStyling = getMoodStyling(currentMood)

  return (
    <div className={`${className} relative transition-all duration-500 ease-in-out`}>
      <div 
        className="relative w-full h-full"
        style={{
          filter: moodStyling.filter,
          transform: moodStyling.transform,
          opacity: moodStyling.opacity
        }}
      >
        <Image
          src="/yasmine.png"
          alt="Yasmine - Garden Ambassador"
          width={100}
          height={100}
          className="w-full h-full object-contain"
          priority
        />
        
        {/* Mood-specific overlay effects */}
        {currentMood && (
          <>
            {/* Happy sparkles for high moods */}
            {currentMood.value >= 4 && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-2 right-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute bottom-2 left-1/3 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              </div>
            )}
            
            {/* Sad tears for low moods */}
            {currentMood.value <= 2 && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/4 w-0.5 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-1/2 right-1/4 w-0.5 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            )}
            
            {/* Neutral state - subtle breathing animation */}
            {currentMood.value === 3 && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full animate-pulse opacity-20 bg-gray-300 rounded-full"></div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Mood indicator tooltip */}
      {currentMood && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          {currentMood.name}
        </div>
      )}
    </div>
  )
}
