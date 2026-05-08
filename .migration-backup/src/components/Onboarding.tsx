import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Code2, Users, Sparkles, Trophy, MessageSquare, CheckCircle } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState<any>(null);

  useEffect(() => {
    if (!api) return;
    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  const slides = [
    {
      title: "Welcome to Bloxd.code",
      description: "Share and discover code snippets with the community.",
      icon: Code2,
    },
    {
      title: "Join the Community",
      description: "Connect with other developers, create servers, and chat in real-time.",
      icon: Users,
    },
    {
      title: "AI-Powered Help",
      description: "Get instant assistance with your code using AI chat.",
      icon: Sparkles,
    },
    {
      title: "Earn Rewards",
      description: "Contribute to the community and climb the leaderboard.",
      icon: Trophy,
    },
    {
      title: "Share Your Ideas",
      description: "Discuss topics in the forum and share your expertise.",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {slides.map((slide, index) => {
              const Icon = slide.icon;
              return (
                <CarouselItem key={index} className="flex items-center justify-center">
                  <div className="text-center space-y-6 py-8">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto glow-cyan">
                      <Icon className="h-12 w-12 text-primary" />
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-3xl font-bold text-foreground">{slide.title}</h2>
                      <p className="text-lg text-muted-foreground max-w-md mx-auto">{slide.description}</p>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <div className="flex justify-center gap-2 mt-6">
            <CarouselPrevious className="relative position-static mr-auto" />
            <div className="flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 w-2"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <CarouselNext className="relative position-static ml-auto" />
          </div>
        </Carousel>

        <div className="flex gap-3 justify-center mt-8">
          <Button
            variant="ghost"
            onClick={onComplete}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip
          </Button>
          <Button
            variant="neon"
            onClick={onComplete}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Get Started
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-4">
          Slide {currentSlide + 1} of {slides.length}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
