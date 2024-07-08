declare module 'greenlock-express' {
    import { Express } from 'express';

    interface Greenlock {
        serve(app: Express): void;
        listen(port: number): void;
    }

    interface GreenlockConfig {
        packageRoot: string;
        configDir: string;
        maintainerEmail: string;
        cluster?: boolean;
        challenges: { [key: string]: any };
        store: any;
        staging?: boolean;
    }

    function init(config: GreenlockConfig): Greenlock;

    const greenlock: { init: typeof init };

    export = greenlock;
}
