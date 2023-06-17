import { navigateTo } from "./router.js"

export default async function() {
    addRegisterPageHtml()

    addPasswordConfirmation()

    addRegisterFormFunctionality()
}

const addPasswordConfirmation = () => {
    var password = document.getElementById("password")
    var confirmPassword = document.getElementById("confirmPassword")

    confirmPassword.addEventListener("input", function() {
        if(password.value != confirmPassword.value) {
            confirmPassword.setCustomValidity("Passwords Don't Match")
        } else {
            confirmPassword.setCustomValidity('')
        }
    })
}

const addRegisterFormFunctionality = () => {
    const registerData = {}
    const registerForm = document.getElementById("registerForm")

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault()
        var formData = new FormData(registerForm)

        for (var [key, value] of formData.entries()) {
            if(key === "age") {
                value = parseInt(value)
            }
            registerData[key] = value
        }

        const options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registerData)
        }
        try {
            const response = await fetch("/post-register", options)
            handleRegisterResponse(response)
        } catch (error) {
            console.error(error)
        }
    })
}

const handleRegisterResponse = async (response) => {
    if(response.ok) {
        navigateTo("/login")
    } else {
        const statusMsg = await response.text()
        console.log(statusMsg)
    }
}

const addRegisterPageHtml = () => {
    document.querySelector("#app").innerHTML = `
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Forum</title>
        </head>
        <body>
            <div style="text-align: center;">
            <div class="header">
                <header style="font-size: 65px;">Registration</header>
            </div><br>
            <form id="registerForm">
                <input class="inputbox" name="nickname" pattern="[A-Za-z\d\-_\.]+" title="Invalid characters detected" placeholder="Nickname" maxlength="15" minlength="3" required></input><br><br>
                <input class="inputbox" name="email" placeholder="Email" type="email" required minlength="6"></input><br><br>
                <input class="inputbox" name="firstName" placeholder="First Name" type="text" required minlength="1"></input><br><br>
                <input class="inputbox" name="lastName" placeholder="Last Name" type="text" required minlength="1"></input><br><br>
                <input class="inputbox" name="age" placeholder="Age" type="number" required minvalue="1" maxvalue="116"></input><br><br>
                <select class="inputbox" name="gender" placeholder="Gender" required>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                </select><br><br>
                <input class="inputbox" name="password" placeholder="Password (6 characters)" type="password" id="password" maxlength="20" minlength="6" required></input><br><br>
                <input class="inputbox" type="password" placeholder="Confirm Password" id="confirmPassword" maxlength="20" minlength="6" required></input><br><br>
                <button type="submit" class="button-33">Register</button>
            </form>
        </div>
        </body>
        </html>
    `
}
    
