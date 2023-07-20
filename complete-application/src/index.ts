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
const cookieName = 'userSession';
const userCookie = 'userDetails';

const client = new FusionAuthClient('noapikeyneeded', fusionAuthURL);

app.use(cookieParser());
//end::top[]

// Static Files
//tag::static[]
app.use('/static', express.static(path.join(__dirname, '../static/')))
//end::static[]

//tag::homepage[]
app.get("/", async (req, res) => {
    const user = req.cookies[userCookie];

    if (user) {
        res.sendFile(path.join(__dirname, '../templates/account.html'));
    } else {
        const stateValue = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const pkcePair = await pkceChallenge();
        res.cookie(cookieName, { stateValue, verifier: pkcePair.code_verifier, challenge: pkcePair.code_challenge }, { httpOnly: true });

        res.sendFile(path.join(__dirname, '../templates/home.html'));
    }
});
//end::homepage[]

//tag::login[]
app.get('/login', function (req, res, next) {
    const userSession = req.cookies[cookieName];

    // Cookie was cleared, just send back (hacky way)
    if (!userSession?.stateValue || !userSession?.challenge) {
        res.redirect(302, '/');
    }

    res.redirect(302, `${fusionAuthURL}/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=http://localhost:${port}/oauth-redirect&state=${userSession?.stateValue}&code_challenge=${userSession?.challenge}&code_challenge_method=S256`)
});
//end::login[]

//tag::oauth-redirect[]
app.get('/oauth-redirect', function (req, res, next) {
    const stateFromFusionAuth = req.query?.state;
    const userSession = req.cookies[cookieName];
    if (stateFromFusionAuth !== userSession?.stateValue) {
        console.log("State doesn't match. uh-oh.");
        console.log("Saw: " + stateFromFusionAuth + ", but expected: " + userSession?.stateValue);
        res.redirect(302, '/');
        return;
    }

    // This code stores the user in a server-side session
    const authCode = `${req.query?.code}`;
    client.exchangeOAuthCodeForAccessTokenUsingPKCE(authCode,
        clientId,
        clientSecret,
        `http://localhost:${port}/oauth-redirect`,
        userSession.verifier)
        .then((response) => {
            console.log(response.response.access_token);
            return client.retrieveUserUsingJWT(`${response.response.access_token}`);
        })
        .then((response) => {
            console.log(response.response.user)
            res.cookie(userCookie, response.response.user)
            return response;
        })
        .then((response) => {
            res.redirect(302, '/');
        }).catch((err) => { console.log("in error"); console.error(JSON.stringify(err)); });

});
//end::oauth-redirect[]

//tag::logout[]
app.get('/logout', function (req, res, next) {
    console.log('Logging out...')
    res.clearCookie(cookieName);
    res.clearCookie(userCookie);

    const userSession = req.cookies[cookieName];

    if (userSession) {
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
