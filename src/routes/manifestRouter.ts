import { Request, Response } from 'express';

export const getManifest = (req: Request, res: Response): void => {
    const manifest = {
        url: "https://ton-connect.github.io/Terminus",
        name: "Terminus",
        iconUrl: "https://ton-connect.github.io/demo-dapp/apple-touch-icon.png",
        termsOfUseUrl: "https://ton-connect.github.io/demo-dapp/terms-of-use.txt",
        privacyPolicyUrl: "https://ton-connect.github.io/demo-dapp/privacy-policy.txt"
    };

    res.json(manifest);
};

export const getTermOfUse = (req: Request, res: Response): void => {
    const manifest = {
        TermsOfUseExample: "Terms of use example"
    };

    res.json(manifest);
}