# Solution

## Recon

By opening the URL http://127.0.0.1:3333, we can see that a Singin Page has provided the following credential to log in as a guest user:

* **Username**: guest
* **Password**: pass123

So let's use them to log in and see more entry points.

![Credentials](https://i.ibb.co/gPmx1Qd/1-guest-account.png)

After signing, we can see a Url Downloader mechanism, but the guest user doesn't have permission to use this feature.

![NotAdmin](https://i.ibb.co/wQKHnMg/4-you-arenotetheadmin.png)

It's always a good idea to check what cookie the Web Site is using, in this case, after the login, the server provided the **admin_session** cookie, which is how the server knows that we are logged in as a guest.

![LogIn](https://i.ibb.co/89Xnqhx/3-login-response.png)

The cookie is apparently safe, so let's take a look at the source code.
At the source code, in the routes.js file, we can see that there is a credential DB with the guest and admin username and password. Looking with attention, you can see that the following value is set to the admin account:

```
 "isAdmin":true
```

Looking at the route **/admin/check_url** (the route used to download the URL), you can see a **checkLogin** and a **checkAdmin** function, responsible to grant or deny access to users that called this route.

![check_url](https://i.ibb.co/HHqcHFC/7-check-url-code.png)

There is a command execution after the isAdmin check, passing the chosen URL to the command without arguments scaping. So if we gain administrative permissions, we can easily trigger a remote command execution vulnerability.

Since we don't have the admin credentials, because it's a random string, let's take a look into the **checkLogin** and **checkAdmin** functions to see if we find a bypass.

Well, there is nothing interesting in the **checkLogin** function, since we already have a valid credential, let's look the **checkAdmin** function:

![checkAdmin](https://i.ibb.co/7WTsWmj/8-check-admin-code.png)

This function checks if the requested cookie has administrative permissions, the parameter that defines it is the `isAdmin`, that we already have noted above. But, the guest user doesn't have this permission, and this code is apparently secure, how can we bypass it? Well, let's take a deep look into the code.

Looking with attention to the **/admin/check_url** route, we can see that the developer has implemented a security log feature, defined by the **securityLog** function. This function will be trigged when a non-valid user tries to call this API.

![securityLogCall](https://i.ibb.co/L96PzGn/12e076f8-b9f3-40e4-ac53-e1474e916b64.jpg)

Looking at the function code we can see that it's using the **node.extend** function to concatenate two different JSON into the **log** variable, that will be logged with the **console.log** function.

![securityLogCode](https://i.ibb.co/djx5FxN/9-security-Log-code.png)

As well known, the **node.extend** function is vulnerable to Prototype Pollution, witch can lead to the **credentials DB** pollution, allowing to bypass the **checkAdmin** function.

## Exploit

## Remote Command Execution and Reverse Shell
