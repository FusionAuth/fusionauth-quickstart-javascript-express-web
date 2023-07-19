import FusionAuthClient, { GrantType, KeyAlgorithm } from "@fusionauth/typescript-client";

/** 
 * You can find these in /kickstart/kickstart.json
 * Don't add production keys to repo for production!
 * You could also do all of this in the kickstart, this example
 * is meant to show off how to use the SDK on a Serverside example.
**/

const TENANT_ID = "d7d09513-a3f5-401c-9685-34ab6c552453"
const API_KEY = "33052c8a-c283-4e96-9d2a-eb1215c69f8f-not-for-prod"
const RSA_KEY_ID = "356a6624-b33c-471a-b707-48bbfcfbc593"

const client = new FusionAuthClient(API_KEY, 'http://localhost:9011', TENANT_ID)

// Issuer: http://localhost:9011/admin/tenant/edit/d7d09513-a3f5-401c-9685-34ab6c552453
const patchTenant = async () => {
    return client.patchTenant(TENANT_ID, { "tenant": { "issuer": "http://localhost:9011" } })
}

// Key: http://localhost:9011/admin/key/
const generateKey = async () => {
    return client.generateKey(RSA_KEY_ID, {
        key: {
            algorithm: KeyAlgorithm.RS256,
            name: "For JSExampleApp",
            length: 2048
        }
    })
}

// Application: http://localhost:9011/admin/application/
const createApplication = async () => {
    return client.createApplication('', {
        application: {
            name: 'JSExampleApp',
            oauthConfiguration: {
                authorizedRedirectURLs: [
                    'http://localhost:3000'
                ],
                requireRegistration: true,
                enabledGrants: [
                    GrantType.authorization_code,
                    GrantType.refresh_token
                ],
                logoutURL: 'http://localhost:3000/logout',
                clientSecret: '2HYT86lWSAntc-mvtHLX5XXEpk9ThcqZb4YEh65CLjA-not-for-prod'
            },
            // assign key from above to sign our tokens. This needs to be asymmetric
            jwtConfiguration: {
                enabled: true,
                accessTokenKeyId: RSA_KEY_ID,
                idTokenKeyId: RSA_KEY_ID
            }
        }
    })
}

// Users: http://localhost:9011/admin/user/
const getFirstUser = async () => {
    const users = (await client.searchUsersByQuery({ "search": { "queryString": "*richard@example.com*" } })).response.users;
    return users?.at(0);
}

const updateUser = async (userId: string) => {
    return (await client.patchUser(userId, {
        user: {
            fullName: "Richard Bray"
        }
    })).response.user
}

const registerUser = async (userId: string, applicationId: string) => {
    client.register(userId, {
        registration: {
            applicationId,
        }
    })

}

// Main Execution
(async () => {
    await patchTenant()
    console.log('patched Tenant')

    await generateKey()
    console.log('generated RSA Key')

    const application = (await createApplication()).response.application
    if (!application?.id) return;
    console.log('Created Application: ', application?.name)

    let user = await getFirstUser()
    if (!user?.id) return;
    console.log('Found User: ', user?.email)

    // patch the user to make sure they have a full name, otherwise OIDC has issues
    user = await updateUser(user?.id)
    if (!user?.id) return;
    console.log('Updated User full name: ', user?.fullName);

    // Register user to new application
    await registerUser(user.id, application.id);
    console.log('Registered: ', user?.email, 'With App', application.name)
})().catch(err => {
    console.error(JSON.stringify(err))
});

