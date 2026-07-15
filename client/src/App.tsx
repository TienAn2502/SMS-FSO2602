import '@/App.css';

import { toast } from 'sonner';

import { ModeToggle } from '@/components/common/mode-toggle';
import { Button } from '@/components/ui/button';

export default function App() {
    return (
        <div className='flex min-h-svh flex-col items-center justify-center gap-4 p-4'>
            <div className='absolute top-4 right-4'>
                <ModeToggle />
            </div>
            <Button
                variant='outline'
                onClick={() =>
                    toast('Event has been created', {
                        description: 'Sunday, December 03, 2023 at 9:00 AM',
                        action: {
                            label: 'Undo',
                            onClick: () => console.log('Undo'),
                        },
                        position: 'top-right',
                    })
                }
            >
                Show Toast
            </Button>
        </div>
    );
}
