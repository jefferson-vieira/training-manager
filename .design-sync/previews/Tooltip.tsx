import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'web';
import { Info } from 'lucide-react';

export function Open() {
  return (
    <TooltipProvider>
      <div className="flex min-h-32 items-end justify-center pt-16">
        <Tooltip defaultOpen>
          <TooltipTrigger
            render={
              <Button aria-label="Sobre o volume" size="icon" variant="outline">
                <Info />
              </Button>
            }
          />
          <TooltipContent side="top">
            Volume semanal é a soma das séries efetivas por grupo muscular.
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
