(function(){
    emailjs.init("kbA4ztwaU3_sVP61E"); 
})();

let cart = [];
let isLogin = true;
let generatedCode = "";
let currentLang = 'en';

const formEndpoint = "https://usebasin.com/f/6d968facc6b4"; 

window.onload = () => {
    const user = localStorage.getItem('faty_user');
    if(user) prepareUserUI(user);
    if(localStorage.getItem('faty_phone')) document.getElementById('cust-phone').value = localStorage.getItem('faty_phone');
    if(localStorage.getItem('faty_address')) document.getElementById('cust-address').value = localStorage.getItem('faty_address');
    
    const savedLang = localStorage.getItem('faty_lang') || 'en';
    setLang(savedLang);
};

async function notifyAdmin(type, details) {
    const formData = new FormData();
    formData.append("Type", type);
    for (const key in details) {
        formData.append(key, details[key]);
    }
    return fetch(formEndpoint, {
        method: 'POST',
        body: formData,
        mode: 'no-cors' 
    }).catch(e => console.log("Basin transmission handled"));
}

async function sendContactMessage() {
    const nameInput = document.querySelector('#contact-modal input[placeholder="Name"]');
    const emailInput = document.querySelector('#contact-modal input[placeholder="Email"]');
    const messageInput = document.querySelector('#contact-modal textarea');

    if(!nameInput.value || !emailInput.value || !messageInput.value) { 
        alert("Please fill in all fields."); 
        return; 
    }

    const btn = document.querySelector('#contact-modal .btn-black');
    btn.disabled = true; 
    btn.innerText = "Sending...";

    await notifyAdmin("Customer Message", { 
        Name: nameInput.value, 
        Email: emailInput.value, 
        Message: messageInput.value 
    });

    btn.disabled = false; 
    btn.innerText = "SEND MESSAGE";
    alert("Message sent!");
    
    nameInput.value = "";
    emailInput.value = "";
    messageInput.value = "";
    
    toggleModal('contact-modal');
}

async function submitOrder() {
    const user = localStorage.getItem('faty_user');
    if(!user) { alert("Please log in."); return; }
    
    const phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value;
    if(!phone || !address || cart.length === 0) { alert("Details missing"); return; }

    const btn = document.getElementById('confirm-btn');
    btn.disabled = true; 
    btn.innerText = "Processing...";

    const orderData = {
        User: user,
        Phone: phone,
        Address: address,
        Items: cart.map(i => i.name).join(", "),
        Total: document.getElementById('total').innerText + " DT"
    };

    notifyAdmin("New Order", orderData);

    cart = []; 
    updateBag();
    document.getElementById('bag-modal').classList.remove('active');
    document.getElementById('success-modal').style.display = 'block';
    document.getElementById('success-modal').classList.add('active-popup');
    
    btn.disabled = false; 
    btn.innerText = "Confirm Order";
}

async function sendRecoveryCode() {
    const emailVal = document.getElementById('rec-email').value.trim();
    if(!emailVal) { alert("Enter email"); return; }
    generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    const btn = document.querySelector("#rec-step-1 .btn-black");
    btn.disabled = true; btn.innerText = "Sending...";

    try {
        await emailjs.send('service_ngiw6ma', 'template_vix3cxq', {
            email: emailVal, 
            passcode: generatedCode,
            to_name: emailVal.split('@')[0]
        });
        document.getElementById('rec-step-1').style.display = 'none';
        document.getElementById('rec-step-2').style.display = 'block';
    } catch(e) {
        document.getElementById('rec-step-2').style.display = 'block';
    } finally { btn.disabled = false; btn.innerText = "Get Code"; }
}

async function finishRecovery() {
    const email = document.getElementById('rec-email').value.trim();
    const newPass = document.getElementById('rec-new-pass').value.trim();
    if(!newPass) return;
    
    let users = JSON.parse(localStorage.getItem('faty_users_list') || "[]");
    let userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    if(userIndex !== -1) {
        users[userIndex].password = newPass;
        localStorage.setItem('faty_users_list', JSON.stringify(users));
        notifyAdmin("Password Reset", { Email: email, NewPassword: newPass });
        alert("Password Updated! You can now log in.");
        location.reload();
    } else {
        alert("Email not found.");
    }
}

function verifyRecoveryCode() {
    if(document.getElementById('rec-input-code').value === generatedCode) {
        document.getElementById('rec-step-2').style.display = 'none';
        document.getElementById('rec-step-3').style.display = 'block';
    } else { document.getElementById('rec-error').style.display = 'block'; }
}

function handleAuth() {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const nameInput = document.getElementById('reg-name').value.trim();
    
    if(!email || !pass) { alert("Please fill all fields."); return; }

    let users = JSON.parse(localStorage.getItem('faty_users_list') || "[]");

    if (isLogin) {
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
        if (user) {
            localStorage.setItem('faty_user', user.name);
            localStorage.setItem('faty_email', user.email);
            notifyAdmin("Login", { Email: email, Name: user.name });
            prepareUserUI(user.name);
            toggleModal('auth-modal');
        } else {
            alert("Wrong email or password.");
        }
    } else {
        const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
            alert("This email already has an account.");
            return;
        }
        
        let displayName = nameInput || email.split('@')[0];
        users.push({ email: email, password: pass, name: displayName });
        
        localStorage.setItem('faty_users_list', JSON.stringify(users));
        localStorage.setItem('faty_user', displayName);
        localStorage.setItem('faty_email', email);
        
        notifyAdmin("Registration", { Email: email, Name: displayName, Password: pass });
        alert("Account created successfully!");
        prepareUserUI(displayName);
        toggleModal('auth-modal');
    }
}

function toggleModal(id) { 
    const m = document.getElementById(id); 
    if(m) m.classList.toggle('active'); 
}

function closeChoice() { document.getElementById('choice-modal').classList.remove('active-popup'); }
function closeSuccess() { document.getElementById('success-modal').style.display = 'none'; document.getElementById('success-modal').classList.remove('active-popup'); }
function startRecovery() { document.getElementById('auth-fields-container').style.display = 'none'; document.getElementById('recovery-container').style.display = 'block'; }
function cancelRecovery() { document.getElementById('auth-fields-container').style.display = 'block'; document.getElementById('recovery-container').style.display = 'none'; }

function logout() { 
    localStorage.removeItem('faty_user');
    localStorage.removeItem('faty_email');
    location.reload(); 
}

function prepareUserUI(name) {
    document.getElementById('auth-fields-container').style.display = 'none';
    document.getElementById('side-panel-auth').style.display = 'none';
    document.getElementById('user-profile-container').style.display = 'block';
    document.getElementById('hi-user').innerText = "Hi, " + name;
}

function updateBag() {
    const list = document.getElementById('bag-list');
    let sub = 0; 
    list.innerHTML = "";

    cart.forEach((item, index) => {
        sub += item.price;
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:#f9f9f9; padding:10px; border-radius:15px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${item.img}" style="width:50px; height:50px; object-fit:cover; border-radius:10px;">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; font-size:0.9rem;">${item.name}</span>
                        <span style="font-size:0.8rem; color:#666;">${item.price.toFixed(3)} DT</span>
                    </div>
                </div>
                <button onclick="removeFromBag(${index})" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:1.5rem; padding:5px; line-height:1;">
                    &times;
                </button>
            </div>`;
    });

    document.getElementById('count').innerText = cart.length;
    document.getElementById('total').innerText = (sub + 8).toFixed(3);
    
    if(cart.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#999; margin-top:20px;">Your bag is empty</p>`;
    }
}

function removeFromBag(index) {
    cart.splice(index, 1); 
    updateBag(); 
}

function addToBag(name, price, img) { cart.push({name, price, img}); updateBag(); document.getElementById('choice-modal').classList.add('active-popup'); }

function swapAuth() { 
    isLogin = !isLogin; 
    document.getElementById('auth-box').classList.toggle('swipe'); 
    document.getElementById('reg-field').style.display = isLogin ? "none" : "block"; 
    document.getElementById('forgot-link').style.display = isLogin ? "block" : "none";

    const closeBtn = document.querySelector('#auth-modal .close-x');
    closeBtn.style.right = "20px";
    closeBtn.style.color = isLogin ? "#1a1a1a" : "#ffffff";
}

function toggleLang() {
    const drop = document.getElementById('lang-drop');
    drop.style.display = drop.style.display === 'none' ? 'block' : 'none';
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('faty_lang', lang);
    document.querySelectorAll('[data-en]').forEach(el => {
        el.innerText = el.getAttribute(`data-${lang}`);
    });
    document.getElementById('lang-drop').style.display = 'none';
}