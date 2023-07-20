//tag::top[]
import FusionAuthClient from "@fusionauth/typescript-client";
import express from 'express';
import cookieParser from 'cookie-parser';
import pkceChallenge from 'pkce-challenge';
import * as path from 'path';

const app = express();
const port = 8080; // default port to listen


//API Keys: http://localhost:9011/admin/api-key/
const clientId = "e9fdb985-9173-4e01-9d73-ac2d60d1dc8e";
const clientSecret = "2HYT86lWSAntc-mvtHLX5XXEpk9ThcqZb4YEh65CLjA-not-for-prod"
const fusionAuthURL = 'http://localhost:9011';

//Cookies
const userSession = 'userSession';
const userToken = 'userToken';
const userDetails = 'userDetails'; //Non Http-Only with user info (not trusted)

const client = new FusionAuthClient('noapikeyneeded', fusionAuthURL);

app.use(cookieParser());
//end::top[]

// Static Files
//tag::static[]
app.use('/static', express.static(path.join(__dirname, '../static/')))
//end::static[]

//tag::homepage[]
app.get("/", async (req, res) => {
    const userTokenCookie = req.cookies[userToken];

    if (userTokenCookie) {
        res.redirect(302, '/account');
    } else {
        const stateValue = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const pkcePair = await pkceChallenge();
        res.cookie(userSession, { stateValue, verifier: pkcePair.code_verifier, challenge: pkcePair.code_challenge }, { httpOnly: true });

        res.sendFile(path.join(__dirname, '../templates/home.html'));
    }
});
//end::homepage[]

//tag::login[]
app.get('/login', (req, res, next) => {
    const userSessionCookie = req.cookies[userSession];

    // Cookie was cleared, just send back (hacky way)
    if (!userSessionCookie?.stateValue || !userSessionCookie?.challenge) {
        res.redirect(302, '/');
    }

    res.redirect(302, `${fusionAuthURL}/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=http://localhost:${port}/oauth-redirect&state=${userSessionCookie?.stateValue}&code_challenge=${userSessionCookie?.challenge}&code_challenge_method=S256`)
});
//end::login[]

//tag::oauth-redirect[]
app.get('/oauth-redirect', async (req, res, next) => {
    // Capture query params
    const stateFromFusionAuth = `${req.query?.state}`;
    const authCode = `${req.query?.code}`;

    // Validate cookie state matches FusionAuth's returned state
    const userSessionCookie = req.cookies[userSession];
    if (stateFromFusionAuth !== userSessionCookie?.stateValue) {
        console.log("State doesn't match. uh-oh.");
        console.log("Saw: " + stateFromFusionAuth + ", but expected: " + userSessionCookie?.stateValue);
        res.redirect(302, '/');
        return;
    }

    // Exchange Auth Code and Verifier for Access Token
    const accessToken = (await client.exchangeOAuthCodeForAccessTokenUsingPKCE(authCode,
        clientId,
        clientSecret,
        `http://localhost:${port}/oauth-redirect`,
        userSessionCookie.verifier)).response;

    if (!accessToken.access_token) {
        console.error('Failed to get Access Token')
        return;
    }
    res.cookie(userToken, accessToken, { httpOnly: true })

    // Exchange Access Token for User
    const userResponse = (await client.retrieveUserUsingJWT(accessToken.access_token)).response;
    if (!userResponse?.user) {
        console.error('Failed to get User from access token, redirecting home.');
        res.redirect(302, '/');
    }
    res.cookie(userDetails, userResponse.user);

    res.redirect(302, '/');
});
//end::oauth-redirect[]

//tag::account[]
app.get("/account", async (req, res) => {
    const userTokenCookie = req.cookies[userToken];

    // Make sure the user is authenticated. Note that in a production application, we would validate the token signature, 
    // make sure it wasn't expired, and attempt to refresh it if it were
    if (!userTokenCookie) {
        res.redirect(302, '/');
    } else {
        res.sendFile(path.join(__dirname, '../templates/account.html'));
    }
});
//end::account[]

//tag::logout[]
app.get('/logout', (req, res, next) => {
    console.log('Logging out...')
    res.clearCookie(userSession);
    res.clearCookie(userToken);
    res.clearCookie(userDetails);

    const userSessionCookie = req.cookies[userSession];

    if (userSessionCookie) {
        res.redirect(302, `${fusionAuthURL}/oauth2/logout?client_id=${clientId}`);
    } else {
        res.redirect(302, '/')
    }
});
//end::logout[]

// start the Express server
//tag::app[]
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});
//end::app[]
