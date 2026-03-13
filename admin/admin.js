const API = "https://pinhoanglong-miniapp.onrender.com"

async function loadProducts(){

  const res = await fetch(API + "/products")
  const data = await res.json()

  const list = document.getElementById("list")
  list.innerHTML=""

  data.forEach(p=>{
    const li=document.createElement("li")
    li.innerText = p.name + " - " + p.price
    list.appendChild(li)
  })

}

async function createProduct(){

  const name=document.getElementById("name").value
  const price=document.getElementById("price").value

  await fetch(API + "/products",{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name,price})
  })

  loadProducts()
}

loadProducts()