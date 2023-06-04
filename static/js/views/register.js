export default async function() {
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
            <input class="inputbox" id="username" pattern="[A-Za-z\d\-_\.]+" title="Invalid characters detected" placeholder="Username" maxlength="15" minlength="3" required></input><br><br>
            <input class="inputbox" id="email" placeholder="Email" type="email" required minlength="6"></input><br><br>
            <input class="inputbox" id="firstName" placeholder="First Name" type="text" required minlength="1"></input><br><br>
            <input class="inputbox" id="lastName" placeholder="Last Name" type="text" required minlength="1"></input><br><br>
            <input class="inputbox" id="age" placeholder="Age" type="number" required minvalue="1" maxvalue="116"></input><br><br>
            <input class="inputbox" id="password" placeholder="Password (6 characters)" type="password" id="password" maxlength="20" minlength="6" required></input><br><br>
            <input class="inputbox" type="password" placeholder="Confirm Password" id="confirmPassword" maxlength="20" minlength="6" required></input><br><br>
            <button id="registerBtn" class="button-33">Register</button>
        </form>
    </div>
    </body>
    </html>
    `

    document.getElementById("registerBtn").addEventListener("click", (event) => {
        event.preventDefault()
        console.log("yes")
    })
}


    
function validatePassword(password, confirmPassword){
    console.log(password.value)
    if(password.value != confirmPassword.value) {
        console.log("no match")
        confirmPassword.setCustomValidity("Passwords Don't Match")
    } else {
        confirmPassword.setCustomValidity('')
    }
}
    
