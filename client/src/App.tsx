import { AppProviders } from '@/app/providers/app-providers';
import eruda from 'eruda';
export default function App() {
    if (import.meta.env.DEV) {
        eruda.init();
    }
    return <AppProviders />;
}
