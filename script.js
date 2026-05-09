(function(){
    emailjs.init("kbA4ztwaU3_sVP61E"); 
})();

let cart = [];
let isLogin = true;
let generatedCode = "";
let currentLang = 'en';

// --- FORMBOLD ENDPOINTS ---
const ENDPOINTS = {
    signup: "https://formbold.com/s/oYWj2",
    order: "https://formbold.com/s/6M21q",
    review: "https://formbold.com/s/3nqP5",
    general: "https://formbold.com/s/94d87" // Used for Logins and Contact Messages
};

window.onload = () => {
    const user = localStorage.getItem('faty_user');
    if(user) prepareUserUI(user);
    if(localStorage.getItem('faty_phone')) document.getElementById('cust-phone').value = localStorage.getItem('faty_phone');
    if(localStorage.getItem('faty_address')) document.getElementById('cust-address').value = localStorage.getItem('faty_address');
    
    const savedLang = localStorage.getItem('faty_lang') || 'en';
    setLang(savedLang);

    startValentineCountdown();
};

// --- CORRECTED NOTIFYADMIN (Handles Files/Photos) ---
async function notifyAdmin(type, details, targetEndpoint) {
    const formData = new FormData();
    formData.append("Type", type);
    
    // Add text details
    for (const key in details) {
        formData.append(key, details[key]);
    }

    // Grab photo specifically for reviews
    if (type === "Customer Review") {
        const photoInput = document.getElementById('rev-photo');
        if (photoInput && photoInput.files[0]) {
            formData.append("Review_Photo", photoInput.files[0]);
        }
    }
    
    return fetch(targetEndpoint, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    }).catch(e => console.log("FormBold transmission handled"));
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
    }, ENDPOINTS.general);

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

    await notifyAdmin("New Order", orderData, ENDPOINTS.order);

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
        await notifyAdmin("Password Reset", { Email: email, NewPassword: newPass }, ENDPOINTS.general);
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

async function handleAuth() {
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
            await notifyAdmin("Login", { Email: email, Name: user.name }, ENDPOINTS.general);
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
        
        await notifyAdmin("Registration", { Email: email, Name: displayName, Password: pass }, ENDPOINTS.signup);
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
    const fields = document.getElementById('auth-fields-container');
    const side = document.getElementById('side-panel-auth');
    const profile = document.getElementById('user-profile-container');
    if(fields) fields.style.display = 'none';
    if(side) side.style.display = 'none';
    if(profile) profile.style.display = 'block';
    if(document.getElementById('hi-user')) document.getElementById('hi-user').innerText = "Hi, " + name;
}

function updateBag() {
    const list = document.getElementById('bag-list');
    let sub = 0; 
    if(!list) return;
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

    if(document.getElementById('count')) document.getElementById('count').innerText = cart.length;
    if(document.getElementById('total')) document.getElementById('total').innerText = (sub + 8).toFixed(3);
    
    if(cart.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#999; margin-top:20px;">Your bag is empty</p>`;
    }
}

function removeFromBag(index) {
    cart.splice(index, 1); 
    updateBag(); 
}

function addToBag(name, price, img) { 
    cart.push({name, price, img}); 
    updateBag(); 
    
    if(document.getElementById('modal-item-img')) document.getElementById('modal-item-img').src = img;
    if(document.getElementById('modal-item-name')) document.getElementById('modal-item-name').innerText = name;
    if(document.getElementById('modal-item-price')) document.getElementById('modal-item-price').innerText = price.toFixed(3) + " DT";
    
    const choice = document.getElementById('choice-modal');
    if(choice) choice.classList.add('active-popup'); 
}

function swapAuth() { 
    isLogin = !isLogin; 
    const box = document.getElementById('auth-box');
    const reg = document.getElementById('reg-field');
    const forgot = document.getElementById('forgot-link');
    if(box) box.classList.toggle('swipe'); 
    if(reg) reg.style.display = isLogin ? "none" : "block"; 
    if(forgot) forgot.style.display = isLogin ? "block" : "none";

    const closeBtn = document.querySelector('#auth-modal .close-x');
    if(closeBtn) {
        closeBtn.style.right = "20px";
        closeBtn.style.color = isLogin ? "#1a1a1a" : "#ffffff";
    }
}

function toggleLang() {
    const drop = document.getElementById('lang-drop');
    if(drop) drop.style.display = drop.style.display === 'none' ? 'block' : 'none';
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('faty_lang', lang);
    document.querySelectorAll('[data-en]').forEach(el => {
        el.innerText = el.getAttribute(`data-${lang}`);
    });
    const drop = document.getElementById('lang-drop');
    if(drop) drop.style.display = 'none';
}

function startValentineCountdown() {
    const targetDate = new Date("February 14, 2026 00:00:00").getTime();
    
    setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        if(distance > 0) {
            if(document.getElementById("days")) document.getElementById("days").innerText = d;
            if(document.getElementById("hours")) document.getElementById("hours").innerText = h;
            if(document.getElementById("minutes")) document.getElementById("minutes").innerText = m;
            if(document.getElementById("seconds")) document.getElementById("seconds").innerText = s;
        }
    }, 1000);
}

// --- CORRECTED SENDREVIEW (Handles UI and trigger) ---
async function sendReview() {
    const name = document.getElementById('rev-name').value;
    const text = document.getElementById('rev-text').value;
    const photoInput = document.getElementById('rev-photo');

    if(!name || !text) { alert("Please fill all fields."); return; }

    const btn = document.querySelector('#review-modal .btn-black');
    btn.disabled = true; btn.innerText = "Sending...";

    await notifyAdmin("Customer Review", { 
        Name: name, 
        Review: text
    }, ENDPOINTS.review);

    btn.disabled = false; btn.innerText = "Submit Review";
    alert("Thank you for your review!");
    
    document.getElementById('rev-name').value = "";
    document.getElementById('rev-text').value = "";
    if(photoInput) photoInput.value = ""; 
    
    toggleModal('review-modal');
}