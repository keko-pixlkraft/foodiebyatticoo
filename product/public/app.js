/* Foodie by Atticoo — self-contained local UX prototype.
   No network APIs, no real orders, no shared table state, no AI processing.
   All menus/prices/content are fictional and illustrative. */
import { createMediaRequest, eventPhase, defaultTheme as aurelTheme, matchesCalorieLimit, mediaStatus, nextMediaStatus, normalizeTheme, nutritionFields, parseNutrition, readableInk, refreshDefaultDishNames, themePresets as sharedPresets, viewCartRate } from './prototype.js';

const restaurantId = new URLSearchParams(location.search).get('restaurant') === 'aurel-house' ? 'aurel-house' : 'mizora';
const restaurantProfile = restaurantId === 'mizora' ? await fetch('./mizora.json').then(response => {
  if (!response.ok) throw new Error('Unable to load MIZORA menu');
  return response.json();
}) : null;
const defaultTheme = restaurantProfile?.theme || aurelTheme;
const themePresets = restaurantProfile ? [{name:'MIZORA',theme:defaultTheme},...sharedPresets.slice(1)] : sharedPresets;

(() => {
'use strict';
const DB_KEY = restaurantProfile ? 'foodie:attico:mizora:demo:v1' : 'foodie.menu:aurel:demo:v8';
const M0_DB_KEY = 'foodie.menu:aurel:demo:v1';
const AUREL_CATS = [
 {id:'all',name:'All'}, {id:'raw',name:'Raw & Sushi'},
 {id:'starters',name:'Starters'}, {id:'pasta',name:'Pasta & Pizza'},
 {id:'classics',name:'House Classics'}, {id:'bowls',name:'Bowls'},
 {id:'desserts',name:'Desserts'}, {id:'drinks',name:'Drinks'}
];
const CATS = restaurantProfile?.categories || AUREL_CATS;
const sd=(id,name,category,price,summary,components,extra={})=>({id,name,category,price,summary,components,live:true,featured:false,allergens:[],allergensVerified:false,source:'Concept photo',...extra});
const AUREL_SEED=[
 sd('sushi','Aurel Sushi Selection','raw',36,'Salmon, tuna and prawn nigiri, maki and house pickles',['Salmon nigiri','Tuna nigiri','Prawn nigiri','Maki rolls'],{featured:true}),
 sd('garlic-shrimp','Garlic Shrimp','starters',18,'Prawns in garlic oil with chilli, parsley and toasted bread',['Prawns','Garlic oil','Chilli & parsley','Toasted bread']),
 sd('caesar-salad','Caesar Salad','starters',16,'Crisp romaine, chicken, Parmesan and toasted croutons',['Romaine','Chicken','Parmesan','Croutons']),
 sd('taco-trio','Taco Trio','starters',21,'Three soft tacos with savoury fillings, salsa and lime',['Soft tortillas','House fillings','Salsa','Fresh lime']),
 sd('carbonara','Carbonara','pasta',24,'Spaghetti, cured pork, egg yolk and Pecorino',['Spaghetti','Cured pork','Egg yolk','Pecorino']),
 sd('margherita-pizza','Margherita Pizza','pasta',24,'San Marzano tomato, mozzarella, basil and olive oil',['San Marzano tomato','Mozzarella','Basil','Olive oil'],{featured:true}),
 sd('truffle-risotto','Truffle Risotto','pasta',28,'Creamy risotto with wild mushrooms, Parmesan and truffle',['Arborio rice','Wild mushrooms','Parmesan','Truffle']),
 sd('house-burger','Aurel House Burger','classics',26,'Beef patty, aged cheddar, house sauce and fries',['Beef patty','Aged cheddar','House sauce','French fries']),
 sd('aurel-steak','Aurel Steak','classics',42,'Seared beef, silky potato purée, greens and red wine jus',['Seared beef','Potato purée','Seasonal greens','Red wine jus'],{featured:true}),
 sd('roasted-salmon','Roasted Salmon','classics',36,'Herb-crusted salmon, baby potatoes, asparagus and lemon beurre blanc',['Atlantic salmon','Baby potatoes','Green asparagus','Lemon beurre blanc'],{featured:true}),
 sd('tonkotsu-ramen','Tonkotsu Ramen','bowls',23,'Rich pork broth, noodles, sliced pork, egg and nori',['Pork broth','Noodles','Sliced pork','Egg & nori']),
 sd('green-curry','Thai Green Curry','bowls',24,'Fragrant green curry with vegetables, herbs and jasmine rice',['Green curry','Vegetables','Thai basil','Jasmine rice']),
 sd('classic-tiramisu','Classic Tiramisu','desserts',14,'Mascarpone, espresso-soaked sponge and cocoa',['Mascarpone','Espresso','Sponge','Cocoa']),
 sd('chocolate-lava','Chocolate Lava Cake','desserts',15,'Warm chocolate fondant with vanilla ice cream and berries',['Chocolate fondant','Vanilla ice cream','Berries','Chocolate sauce']),
 sd('yuzu-spritz','Yuzu Sunset Spritz','drinks',16,'Yuzu, orange bitters, prosecco and citrus',['Yuzu','Orange bitters','Prosecco','Citrus'],{featured:true,source:'AI demo drink'}),
 sd('espresso-martini','Velvet Espresso Martini','drinks',18,'Espresso, vodka and coffee liqueur under a velvet crema',['Espresso','Vodka','Coffee liqueur','Crema'],{source:'AI demo drink'}),
 sd('lychee-highball','Lychee Basil Highball','drinks',16,'Lychee, basil, gin and sparkling lime',['Lychee','Basil','Gin','Sparkling lime'],{source:'AI demo drink'})
];
const SEED = restaurantProfile?.dishes || AUREL_SEED;
const SAMPLE_NUTRITION = {
  'roasted-salmon': { kcal: 480, protein: 34, carbs: 29, fat: 25, serving: '1 plate', source: 'sample' },
  'green-curry': { kcal: 460, protein: 12, carbs: 58, fat: 20, source: 'sample' },
  'house-burger': { kcal: 680, protein: 32, carbs: 64, fat: 32, source: 'sample' },
  'yuzu-spritz': { kcal: 180, source: 'sample' },
};
const SEED_ALLERGENS={
 'sushi':['Fish','Crustaceans'],
 'garlic-shrimp':['Crustaceans','Gluten'],
 'caesar-salad':['Milk','Eggs','Gluten'],
 'taco-trio':['Gluten'],
 'carbonara':['Gluten','Eggs','Milk'],
 'margherita-pizza':['Gluten','Milk'],
 'truffle-risotto':['Milk'],
 'house-burger':['Gluten','Milk','Eggs'],
 'aurel-steak':['Milk'],
 'roasted-salmon':['Fish','Milk'],
 'tonkotsu-ramen':['Gluten','Eggs','Soy'],
 'green-curry':['Soy'],
 'classic-tiramisu':['Milk','Eggs','Gluten'],
 'chocolate-lava':['Milk','Eggs','Gluten'],
 'yuzu-spritz':['Sulphites'],
 'espresso-martini':['Sulphites'],
 'lychee-highball':['Sulphites']
};
SEED.forEach(d=>{if(SEED_ALLERGENS[d.id]){d.allergens=SEED_ALLERGENS[d.id];d.allergensVerified=false;}});
const uid = ()=>'dish-'+Math.random().toString(36).slice(2,10);
const clone = v => JSON.parse(JSON.stringify(v));
const fmt = v => new Intl.NumberFormat(restaurantProfile ? 'en-US' : 'en-IE',{style:'currency',currency:restaurantProfile?.currency || 'EUR',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v||0));
const e = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const catsName=id=>CATS.find(x=>x.id===id)?.name||'Other';
const ALLERGEN_META={
 'Gluten':{icon:'wheat',label:'Gluten'},
 'Milk':{icon:'milk',label:'Milk'},
 'Eggs':{icon:'egg',label:'Eggs'},
 'Fish':{icon:'fish',label:'Fish'},
 'Crustaceans':{icon:'shell',label:'Shellfish'},
 'Molluscs':{icon:'shell',label:'Molluscs'},
 'Peanuts':{icon:'nut',label:'Peanuts'},
 'Tree nuts':{icon:'nut',label:'Tree nuts'},
 'Soy':{icon:'leaf',label:'Soy'},
 'Sesame':{icon:'seed',label:'Sesame'},
 'Celery':{icon:'leaf',label:'Celery'},
 'Mustard':{icon:'seed',label:'Mustard'},
 'Sulphites':{icon:'spark',label:'Sulphites'}
};

const ALLERGEN_LOCALIZED={
 de:{Gluten:'Gluten',Milk:'Milch',Eggs:'Eier',Fish:'Fisch',Crustaceans:'Krebstiere',Molluscs:'Weichtiere',Peanuts:'Erdnüsse','Tree nuts':'Schalenfrüchte',Soy:'Soja',Sesame:'Sesam',Celery:'Sellerie',Mustard:'Senf',Sulphites:'Sulfite',Lupin:'Lupinen'},
 es:{Gluten:'Gluten',Milk:'Leche',Eggs:'Huevos',Fish:'Pescado',Crustaceans:'Crustáceos',Molluscs:'Moluscos',Peanuts:'Cacahuetes','Tree nuts':'Frutos secos',Soy:'Soja',Sesame:'Sésamo',Celery:'Apio',Mustard:'Mostaza',Sulphites:'Sulfitos',Lupin:'Altramuces'}
};
function allergenName(a){if(restaurantProfile && ui.lang==='en' && a==='Crustaceans')return 'Crustaceans';return ALLERGEN_LOCALIZED[ui.lang]?.[a] || ALLERGEN_META[a]?.label || a;}

const EXPLORE_FOCUS={
 'carbonara':'center 52%',
 'margherita-pizza':'center 52%',
 'roasted-salmon':'center 48%',
 'classic-tiramisu':'center 46%',
 'chocolate-lava':'center 45%',
 'house-burger':'center 48%',
 'espresso-martini':'center 42%',
 'yuzu-spritz':'center 44%',
 'lychee-highball':'center 40%'
};
function renderAllergenChips(list=[],compact=false){
 if(!list.length) return compact?'<span class="allergen-hint">Ask our team about allergens</span>':'<p class="allergen-copy compact-copy">Allergens are not confirmed in this demonstration. Please ask the restaurant team.</p>';
 return `<div class="allergen-icons ${compact?'compact':''}">${list.map(a=>{const meta=ALLERGEN_META[a]||{icon:'spark',label:a};return `<span class="allergen-icon-pill" title="${e(meta.label)}">${restaurantProfile?foodIcon(a):icon(meta.icon)}<em>${e(allergenName(a))}</em></span>`}).join('')}</div>`;
}

// Guest language strings and dish translations are bundled offline.
const UI_I18N={"en":{"all":"All","raw":"Raw & Sushi","starters":"Starters","pasta":"Pasta & Pizza","classics":"House Classics","bowls":"Bowls","desserts":"Desserts","drinks":"Drinks","explore":"Explore","overview":"Overview","filters":"Filters","clear":"Clear all","apply":"Show dishes","any":"Any","preferences":"Dietary preferences","allergyExclude":"Exclude listed allergens","spiceLevel":"Maximum spice level","noSpiceLimit":"Any heat","mild":"Mild","medium":"Medium","hot":"Hot","vegetarian":"Vegetarian","vegan":"Vegan","glutenFree":"Gluten-free","lactoseFree":"Lactose-free","halal":"Halal","demoWarning":"Demo filtering only. Dietary, allergen and halal claims have not been verified. Always confirm ingredients and cross-contact with staff.","filterCount":"matching dishes","noMatches":"No dishes match these filters.","resetFilters":"Reset filters","selection":"Your selection","changeTable":"Table","items":"items","viewCart":"View Cart","each":"each","subtotal":"Estimated subtotal","continue":"Continue browsing","emptyCart":"Nothing selected yet. Explore the menu and add dishes you like.","cartNotice":"This selection is saved only in this browser. No order is placed or shared with the restaurant.","details":"Details","allergens":"Allergens","dietaryDetails":"Dietary details","allergenNotVerified":"Illustrative allergen labels — not restaurant-verified. Please check with staff.","verifiedInfo":"Allergen details marked verified by restaurant owner. Ask staff about cross-contact.","noAllergens":"No allergen information has been supplied.","language":"Language","switchLanguage":"Choose language","review":"Review","googleReview":"Review on Google","reviewTitle":"Share your experience","reviewCopy":"Enjoyed your visit? An optional Google review helps the restaurant.","reviewNotSetup":"Demo only. A Google review link has not been configured by the restaurant.","notNow":"Not now","reviewAction":"Open Google review link","reviewFooter":"Optional · no incentives · based on your own experience","category":"Category","swipe":"Swipe for next dish","onMenu":"On the menu","selections":"selections","demoMenu":"Presentation menu. Proposed entries and prices require restaurant confirmation. Ask staff about allergens.","changeTableTitle":"Choose a table","tableNote":"Each table has a separate cart in this browser. QR links are placeholders.","unverifiedBadge":"Unverified demo match","add":"Add to cart","chooseLanguage":"English","reviewEntry":"Reviews","dismiss":"Close"},"de":{"all":"Alle","raw":"Roh & Sushi","starters":"Vorspeisen","pasta":"Pasta & Pizza","classics":"Hausklassiker","bowls":"Bowls","desserts":"Desserts","drinks":"Getränke","explore":"Entdecken","overview":"Übersicht","filters":"Filter","clear":"Zurücksetzen","apply":"Gerichte anzeigen","any":"Beliebig","preferences":"Ernährungswünsche","allergyExclude":"Angegebene Allergene ausschließen","spiceLevel":"Maximale Schärfe","noSpiceLimit":"Jede Schärfe","mild":"Mild","medium":"Mittel","hot":"Scharf","vegetarian":"Vegetarisch","vegan":"Vegan","glutenFree":"Glutenfrei","lactoseFree":"Laktosefrei","halal":"Halal","demoWarning":"Nur Demo-Filter: Ernährungs-, Allergen- und Halal-Angaben sind nicht geprüft. Zutaten und Kreuzkontakt immer beim Personal bestätigen.","filterCount":"passende Gerichte","noMatches":"Keine Gerichte mit diesen Filtern gefunden.","resetFilters":"Filter zurücksetzen","selection":"Deine Auswahl","changeTable":"Tisch","items":"Artikel","viewCart":"Warenkorb","each":"pro Stück","subtotal":"Geschätzte Zwischensumme","continue":"Weiter entdecken","emptyCart":"Noch keine Gerichte ausgewählt. Entdecke die Karte und füge Gerichte hinzu.","cartNotice":"Diese Auswahl wird nur in diesem Browser gespeichert. Es wird keine Bestellung an das Restaurant gesendet.","details":"Details","allergens":"Allergene","dietaryDetails":"Ernährungsinformationen","allergenNotVerified":"Beispielhafte Allergene, nicht vom Restaurant geprüft. Bitte beim Personal nachfragen.","verifiedInfo":"Vom Betreiber als geprüft markierte Angaben. Kreuzkontakt beim Personal erfragen.","noAllergens":"Keine Allergenangaben hinterlegt.","language":"Sprache","switchLanguage":"Sprache wählen","review":"Bewertung","googleReview":"Bei Google bewerten","reviewTitle":"Erlebnis teilen","reviewCopy":"Dir hat der Besuch gefallen? Eine freiwillige Google-Bewertung hilft dem Restaurant.","reviewNotSetup":"Demo: Es ist noch kein Google-Bewertungslink hinterlegt.","notNow":"Vielleicht später","reviewAction":"Google-Bewertung öffnen","reviewFooter":"Freiwillig · ohne Gegenleistung · basierend auf deinem Erlebnis","category":"Kategorie","swipe":"Wischen für nächstes Gericht","onMenu":"Auf der Karte","selections":"Gerichte","demoMenu":"Präsentationskarte. Vorschläge und Preise bitte vom Restaurant bestätigen lassen. Allergene beim Personal erfragen.","changeTableTitle":"Tisch wählen","tableNote":"Jeder Tisch hat einen eigenen Warenkorb in diesem Browser. QR-Links sind Platzhalter.","unverifiedBadge":"Ungeprüfte Demo-Auswahl","add":"Zum Warenkorb","chooseLanguage":"Deutsch","reviewEntry":"Bewerten","dismiss":"Schließen"},"es":{"all":"Todos","raw":"Crudos y sushi","starters":"Entrantes","pasta":"Pasta y pizza","classics":"Clásicos de la casa","bowls":"Bowls","desserts":"Postres","drinks":"Bebidas","explore":"Explorar","overview":"Carta","filters":"Filtros","clear":"Borrar filtros","apply":"Ver platos","any":"Cualquiera","preferences":"Preferencias alimentarias","allergyExclude":"Excluir alérgenos indicados","spiceLevel":"Nivel máximo de picante","noSpiceLimit":"Cualquier nivel","mild":"Suave","medium":"Medio","hot":"Picante","vegetarian":"Vegetariano","vegan":"Vegano","glutenFree":"Sin gluten","lactoseFree":"Sin lactosa","halal":"Halal","demoWarning":"Filtros de demostración: los datos dietéticos, de alérgenos y halal no están verificados. Consulta ingredientes y contaminación cruzada con el personal.","filterCount":"platos disponibles","noMatches":"Ningún plato coincide con estos filtros.","resetFilters":"Restablecer filtros","selection":"Tu selección","changeTable":"Mesa","items":"productos","viewCart":"Ver cesta","each":"unidad","subtotal":"Subtotal estimado","continue":"Seguir explorando","emptyCart":"Todavía no has seleccionado nada. Explora la carta y añade tus platos.","cartNotice":"Esta selección se guarda solo en este navegador. No se envía ningún pedido al restaurante.","details":"Detalles","allergens":"Alérgenos","dietaryDetails":"Información dietética","allergenNotVerified":"Alérgenos de ejemplo, no verificados por el restaurante. Consulta al personal.","verifiedInfo":"Información marcada como verificada por el restaurante. Consulta posible contaminación cruzada.","noAllergens":"No hay datos de alérgenos.","language":"Idioma","switchLanguage":"Elegir idioma","review":"Reseña","googleReview":"Reseñar en Google","reviewTitle":"Comparte tu experiencia","reviewCopy":"¿Te ha gustado la visita? Una reseña opcional en Google ayuda al restaurante.","reviewNotSetup":"Demo: todavía no hay enlace a reseñas de Google configurado.","notNow":"Ahora no","reviewAction":"Abrir reseña en Google","reviewFooter":"Opcional · sin incentivos · basada en tu experiencia","category":"Categoría","swipe":"Desliza para otro plato","onMenu":"En la carta","selections":"opciones","demoMenu":"Carta de presentación. Las propuestas y los precios requieren confirmación. Consulta los alérgenos al personal.","changeTableTitle":"Elegir mesa","tableNote":"Cada mesa tiene una cesta independiente en este navegador. Los QR son de muestra.","unverifiedBadge":"Coincidencia no verificada","add":"Añadir a la cesta","chooseLanguage":"Español","reviewEntry":"Reseñas","dismiss":"Cerrar"}};
const DISH_I18N={"sushi":{"de":{"name":"Aurel Sushi Auswahl","summary":"Nigiri mit Lachs, Thunfisch und Garnele, Maki und hausgemachtes Pickles"},"es":{"name":"Selección de sushi Aurel","summary":"Nigiris de salmón, atún y langostino, makis y encurtidos"}},"garlic-shrimp":{"de":{"name":"Knoblauchgarnelen","summary":"Garnelen in Knoblauchöl mit Chili, Petersilie und geröstetem Brot"},"es":{"name":"Gambas al ajillo","summary":"Gambas con ajo, guindilla, perejil y pan tostado"}},"caesar-salad":{"de":{"name":"Caesar-Salat","summary":"Romanasalat mit Hähnchen, Parmesan und knusprigen Croutons"},"es":{"name":"Ensalada César","summary":"Lechuga romana con pollo, parmesano y picatostes"}},"taco-trio":{"de":{"name":"Taco-Trio","summary":"Drei weiche Tacos mit würziger Füllung, Salsa und Limette"},"es":{"name":"Trío de tacos","summary":"Tres tacos suaves con relleno, salsa y lima"}},"carbonara":{"de":{"name":"Carbonara","summary":"Spaghetti mit gepökeltem Schweinefleisch, Eigelb und Pecorino"},"es":{"name":"Carbonara","summary":"Espaguetis con cerdo curado, yema de huevo y pecorino"}},"margherita-pizza":{"de":{"name":"Pizza Margherita","summary":"San-Marzano-Tomaten, Mozzarella, Basilikum und Olivenöl"},"es":{"name":"Pizza margarita","summary":"Tomate San Marzano, mozzarella, albahaca y aceite de oliva"}},"truffle-risotto":{"de":{"name":"Trüffelrisotto","summary":"Cremiges Risotto mit Waldpilzen, Parmesan und Trüffel"},"es":{"name":"Risotto de trufa","summary":"Risotto cremoso con setas, parmesano y trufa"}},"house-burger":{"de":{"name":"Aurel Hausburger","summary":"Rindfleisch, gereifter Cheddar, Haussauce und Pommes"},"es":{"name":"Hamburguesa Aurel","summary":"Ternera, cheddar curado, salsa de la casa y patatas fritas"}},"aurel-steak":{"de":{"name":"Aurel Steak","summary":"Gebratenes Rindfleisch, Kartoffelpüree, Gemüse und Rotweinjus"},"es":{"name":"Filete Aurel","summary":"Ternera sellada, puré de patatas, verduras y jugo al vino tinto"}},"roasted-salmon":{"de":{"name":"Gebratener Lachs","summary":"Lachs mit Kräuterkruste, Babykartoffeln, Spargel und Zitronenbutter"},"es":{"name":"Salmón asado","summary":"Salmón con hierbas, patatas pequeñas, espárragos y mantequilla al limón"}},"tonkotsu-ramen":{"de":{"name":"Tonkotsu-Ramen","summary":"Kräftige Schweinebrühe, Nudeln, Schweinefleisch, Ei und Nori"},"es":{"name":"Ramen tonkotsu","summary":"Caldo de cerdo, fideos, cerdo, huevo y nori"}},"green-curry":{"de":{"name":"Thailändisches grünes Curry","summary":"Duftendes grünes Curry mit Gemüse, Kräutern und Jasminreis"},"es":{"name":"Curry verde tailandés","summary":"Curry verde aromático con verduras, hierbas y arroz jazmín"}},"classic-tiramisu":{"de":{"name":"Klassisches Tiramisu","summary":"Mascarpone, in Espresso getränkter Biskuit und Kakao"},"es":{"name":"Tiramisú clásico","summary":"Mascarpone, bizcocho con espresso y cacao"}},"chocolate-lava":{"de":{"name":"Schokoküchlein mit flüssigem Kern","summary":"Warmes Schokofondant mit Vanilleeis und Beeren"},"es":{"name":"Coulant de chocolate","summary":"Coulant caliente con helado de vainilla y frutos rojos"}},"yuzu-spritz":{"de":{"name":"Yuzu Sunset Spritz","summary":"Yuzu, Orangenbitter, Prosecco und Zitrusfrüchte"},"es":{"name":"Yuzu Sunset Spritz","summary":"Yuzu, bíter de naranja, prosecco y cítricos"}},"espresso-martini":{"de":{"name":"Velvet Espresso Martini","summary":"Espresso, Wodka und Kaffeelikör mit cremiger Haube"},"es":{"name":"Velvet Espresso Martini","summary":"Espresso, vodka y licor de café con crema aterciopelada"}},"lychee-highball":{"de":{"name":"Lychee Basil Highball","summary":"Litschi, Basilikum, Gin und prickelnde Limette"},"es":{"name":"Lychee Basil Highball","summary":"Lichi, albahaca, ginebra y lima con gas"}}};
const DEMO_DIETARY={"sushi":{"glutenFree":false,"lactoseFree":true,"spice":0},"garlic-shrimp":{"lactoseFree":true,"spice":1},"caesar-salad":{"spice":0},"taco-trio":{"spice":2},"carbonara":{"spice":0},"margherita-pizza":{"vegetarian":true,"spice":0},"truffle-risotto":{"vegetarian":true,"glutenFree":true,"spice":0},"house-burger":{"spice":0},"aurel-steak":{"glutenFree":true,"spice":0},"roasted-salmon":{"glutenFree":true,"spice":0},"tonkotsu-ramen":{"spice":1},"green-curry":{"vegetarian":true,"vegan":true,"glutenFree":true,"lactoseFree":true,"halal":true,"spice":2},"classic-tiramisu":{"vegetarian":true,"spice":0},"chocolate-lava":{"vegetarian":true,"spice":0},"yuzu-spritz":{"vegetarian":true,"vegan":true,"lactoseFree":true,"spice":0},"espresso-martini":{"vegetarian":true,"vegan":true,"lactoseFree":true,"spice":0},"lychee-highball":{"vegetarian":true,"vegan":true,"lactoseFree":true,"spice":0}};
const DIET_KEYS=['vegetarian','vegan','glutenFree','lactoseFree','halal'];
const FILTER_ALLERGENS=['Gluten','Milk','Eggs','Fish','Crustaceans','Molluscs','Peanuts','Tree nuts','Soy','Sesame','Celery','Mustard','Sulphites'];
const NUTRITION_I18N = {
  "en": {
    "nutrition": "Nutrition",
    "noPhoto": "No photo yet",
    "noTable": "No active table",
    "kcal": "Energy",
    "protein": "Protein",
    "carbs": "Carbohydrates",
    "fat": "Fat",
    "serving": "Serving",
    "unavailable": "Not available",
    "sampleNutrition": "Fictional sample estimates",
    "enteredNutrition": "Restaurant-entered estimates",
    "nutritionNote": "Approximate values per listed serving or menu portion. Values are unverified.",
    "calorieLimit": "Estimated calories",
    "anyCalories": "Any amount",
    "underCalories": "Under {limit} kcal",
    "calorieNote": "Only items with a calorie estimate are included when a limit is selected. Use this as a guide.",
    "portionSample": "1 plate"
  },
  "de": {
    "nutrition": "Nährwerte",
    "noPhoto": "Kein Foto verfügbar",
    "noTable": "Kein aktiver Tisch",
    "kcal": "Energie",
    "protein": "Eiweiß",
    "carbs": "Kohlenhydrate",
    "fat": "Fett",
    "serving": "Portion",
    "unavailable": "Nicht verfügbar",
    "sampleNutrition": "Fiktive Beispielschätzungen",
    "enteredNutrition": "Schätzwerte des Restaurants",
    "nutritionNote": "Ungeprüfte Richtwerte pro angegebener Portion oder Menüportion.",
    "calorieLimit": "Geschätzte Kalorien",
    "anyCalories": "Beliebig",
    "underCalories": "Unter {limit} kcal",
    "calorieNote": "Bei einer Obergrenze erscheinen nur Gerichte mit geschätztem Kalorienwert. Die Angaben dienen zur Orientierung.",
    "portionSample": "1 Teller"
  },
  "es": {
    "nutrition": "Información nutricional",
    "noPhoto": "Sin foto disponible",
    "noTable": "No hay mesas activas",
    "kcal": "Energía",
    "protein": "Proteínas",
    "carbs": "Carbohidratos",
    "fat": "Grasas",
    "serving": "Ración",
    "unavailable": "No disponible",
    "sampleNutrition": "Estimaciones ficticias de ejemplo",
    "enteredNutrition": "Estimaciones introducidas por el restaurante",
    "nutritionNote": "Valores aproximados y sin verificar por ración indicada o porción del menú.",
    "calorieLimit": "Calorías estimadas",
    "anyCalories": "Sin límite",
    "underCalories": "Menos de {limit} kcal",
    "calorieNote": "Con un límite, solo se muestran platos con una estimación de calorías. Úsala como referencia.",
    "portionSample": "1 plato"
  }
};
const MIZORA_I18N = {"en":{"sampleNutrition":"Estimated from menu ingredients","nutritionNote":"Demo estimate per menu portion. Portions and recipes are assumed; values may vary substantially.","allergenNotVerified":"Possible allergens estimated from the menu. Other allergens and cross-contact may be present. Please confirm with your server.","demoWarning":"Demo guidance based on menu ingredients and estimated portions. Confirm dietary needs and allergies with your server.","demoMenu":"Prices in USD. * Consuming raw or undercooked fish, shellfish or meat may increase your risk of foodborne illness. Please inform your server of any allergies.","calorieNote":"Approximate kcal per menu portion.","allergyExclude":"Possible allergens to avoid","preferences":"Your preferences","noSpiceLimit":"Any heat"},"de":{"sampleNutrition":"Aus den Menüzutaten geschätzt","nutritionNote":"Demo-Schätzung pro Menüportion. Portionsgrößen und Rezepturen sind angenommen; tatsächliche Werte können deutlich abweichen.","allergenNotVerified":"Mögliche Allergene aus der Menübeschreibung geschätzt. Weitere Allergene und Kreuzkontakt sind möglich. Bitte beim Service bestätigen.","demoWarning":"Demo-Orientierung aus Menüzutaten und geschätzten Portionen. Ernährungswünsche und Allergien beim Service bestätigen.","demoMenu":"Preise in USD. * Roher oder nicht durchgegarter Fisch, Meeresfrüchte und Fleisch können lebensmittelbedingte Erkrankungen verursachen. Bitte informiere den Service über Allergien.","calorieNote":"Ungefähre kcal pro Menüportion.","allergyExclude":"Mögliche Allergene vermeiden","preferences":"Deine Wünsche","noSpiceLimit":"Beliebig"},"es":{"sampleNutrition":"Estimación según los ingredientes","nutritionNote":"Estimación de demo por ración del menú. Porciones y recetas supuestas; los valores reales pueden variar considerablemente.","allergenNotVerified":"Posibles alérgenos estimados según el menú. Puede haber otros alérgenos y contacto cruzado. Confirma con el personal.","demoWarning":"Orientación de demo basada en ingredientes y raciones estimadas. Confirma tus necesidades y alergias con el personal.","demoMenu":"Precios en USD. * El pescado, marisco o carne crudos o poco cocinados pueden aumentar el riesgo de enfermedades alimentarias. Informa al personal de tus alergias.","calorieNote":"Kcal aproximadas por ración.","allergyExclude":"Posibles alérgenos a evitar","preferences":"Tus preferencias","noSpiceLimit":"Cualquiera"}};
const EXPLORE_I18N={en:{swipe:'Swipe left / right',previousDish:'Previous dish',nextDish:'Next dish'},de:{swipe:'Links / rechts wischen',previousDish:'Vorheriges Gericht',nextDish:'Nächstes Gericht'},es:{swipe:'Desliza a los lados',previousDish:'Plato anterior',nextDish:'Siguiente plato'}};
function tr(key){return EXPLORE_I18N[ui.lang]?.[key] || (restaurantProfile && MIZORA_I18N[ui.lang]?.[key]) || NUTRITION_I18N[ui.lang]?.[key]||UI_I18N[ui.lang]?.[key]||UI_I18N.en[key]||key;}
function dishText(d,key){return d?.translations?.[ui.lang]?.[key] || DISH_I18N[d?.id]?.[ui.lang]?.[key] || d?.[key] || '';}
function catLabel(id){const category=CATS.find(c=>c.id===id);return restaurantProfile ? category?.[ui.lang] || category?.name || id : tr(id)||catsName(id);}
function seedDietary(d){return {vegetarian:false,vegan:false,glutenFree:false,lactoseFree:false,halal:false,spice:0,...(DEMO_DIETARY[d.id]||{}),...(d.dietary||{})};}
const CALORIE_LIMITS = [300, 500, 700];
const emptyFilters = () => ({vegetarian:false,vegan:false,glutenFree:false,lactoseFree:false,halal:false,spice:null,exclude:[],calorie:null});
function activeFilterCount(){return DIET_KEYS.filter(k=>ui.guestFilters[k]).length+ui.guestFilters.exclude.length+(ui.guestFilters.spice!==null?1:0)+(ui.guestFilters.calorie!==null?1:0)+(restaurantProfile&&ui.category!=='all'?1:0);}
function canShow(d){const f=ui.guestFilters,profile=seedDietary(d);if(DIET_KEYS.some(k=>f[k]&&!profile[k]))return false;if(restaurantProfile&&f.spice!==null&&typeof d.dietary?.spice!=='number')return false;if(f.exclude.some(a=>(d.allergens||[]).includes(a)))return false;if(f.spice!==null&&Number(profile.spice)>f.spice)return false;return matchesCalorieLimit(d.nutrition,f.calorie);}
function ensureGuestSelected(){const l=listed();if(!l.some(x=>x.id===ui.selected))ui.selected=l[0]?.id||null;}
function reviewLink(){return typeof db.reviewUrl==='string'&&db.reviewEnabled!==false?db.reviewUrl:'';}
function validReviewUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&(/^(?:[a-z0-9-]+\.)?google\.(?:com|es|de|fr|it|co\.uk)$/.test(u.hostname)||['g.page','g.co','maps.app.goo.gl'].includes(u.hostname));}catch{return false;}}

const pad=n=>String(n).padStart(2,'0');
function dishPhoto(d, ratio, { className = '', alt = '', position = '', lazy = false } = {}) {
  const url = d.customPhoto || d.media?.[ratio] || (SEED.some(item => item.id === d.id) ? `assets/${ratio}/${d.id}.webp` : '');
  if (!url) return `<span class="photo-unavailable">${e(ui.surface === 'guest' ? tr('noPhoto') : 'No photo yet')}</span>`;
  const framing = restaurantProfile?.dishes.find(item=>item.id===d.id)?.presentation;
  let photoStyle = position ? 'object-position:'+position+';' : '';
  if (framing && ratio==='explore') {
    photoStyle += '--photo-scale:'+framing.scale+';--photo-x:'+framing.x+'%;--photo-y:'+framing.y+'%;--photo-light:'+framing.brightness+';';
  }
  return `<img src="${e(url)}" alt="${e(alt)}"${className ? ` class="${className}"` : ''}${photoStyle ? ` style="${e(photoStyle)}"` : ''}${lazy ? ' loading="lazy"' : ''} draggable="false">`;
}
const DEFAULT_DB = {
  restaurant: restaurantProfile?.name || 'Aurel House', tagline: restaurantProfile?.tagline || 'Restaurant & Bar', theme: defaultTheme,
  dishes: SEED.map(d => ({ ...d, nutrition: d.nutrition || SAMPLE_NUTRITION[d.id] || null })),
  menuRevision: restaurantProfile?.menuRevision || 0,
  tables: Array.from({ length: 12 }, (_, i) => ({ number: i + 1, active: true })),
  carts: {}, mediaRequests: {}, mediaRequestLog: [], guestLang: 'en', reviewUrl: '', reviewEnabled: true, instagramUrl:'', restaurantEvents:[],
  events: { byLanguage:{}, byDay:{}, views: 0, opens: 0, adds: 0, cartViews: 0, qrPreviews: 0, byDish: {}, byTable: {}, measuredViews: 0, viewsWithAdd: 0, dishViews: {} },
};
function loadDB() {
  const baseline = clone(DEFAULT_DB);
  try {
    const current = localStorage.getItem(DB_KEY);
    const stored = JSON.parse(current ?? (restaurantProfile ? null : localStorage.getItem(M0_DB_KEY)) ?? 'null');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return baseline;
    if (restaurantProfile && stored.menuRevision !== restaurantProfile.menuRevision) {
      const backupKey = DB_KEY + ':before-menu-revision-2';
      if (!localStorage.getItem(backupKey)) localStorage.setItem(backupKey,JSON.stringify(stored));
      const oldDishes = Array.isArray(stored.dishes) ? stored.dishes : [];
      stored.dishes = baseline.dishes.map(d => {
        const previous=oldDishes.find(item=>item.id===d.id);
        return {...d,...(previous?.customPhoto ? {customPhoto:previous.customPhoto} : {}),live:previous?.live ?? d.live};
      }).concat(oldDishes.filter(d=>!baseline.dishes.some(seed=>seed.id===d.id)));
      stored.menuRevision=restaurantProfile.menuRevision;
    }
    const { studioLooks, ...content } = stored;
    return {
      ...baseline, ...content,
      theme: normalizeTheme(stored.theme),
      restaurantEvents:Array.isArray(stored.restaurantEvents)?stored.restaurantEvents:[],
      mediaRequestLog:Array.isArray(stored.mediaRequestLog)?stored.mediaRequestLog:[],
      events: { ...baseline.events, ...stored.events },
      dishes: Array.isArray(stored.dishes) ? (restaurantProfile ? refreshDefaultDishNames(stored.dishes,baseline.dishes) : stored.dishes) : baseline.dishes,
      tables: Array.isArray(stored.tables) ? stored.tables : baseline.tables,
    };
  } catch { return baseline; }
}
let db=loadDB();
const queryTable=(()=>{try{return new URLSearchParams(location.search).get('table')}catch{return null}})();
const embedMode=(()=>{try{const x=new URLSearchParams(location.search).get('embed');return x==='guest'||x==='owner'?x:location.pathname==='/guest'?'guest':location.pathname==='/owner'?'owner':''}catch{return ''}})();
document.body.dataset.embed=embedMode;
document.body.dataset.restaurant=restaurantId;
document.title='Foodie by Atticoo · '+(restaurantProfile?.name || 'Aurel House');
let ui = {
  lang: ['en','de','es'].includes(db.guestLang) ? db.guestLang : 'en', guestFilters: emptyFilters(),
  surface: 'guest', mode: 'explore', category: 'all', selected: restaurantProfile ? 'mizora-03' : 'roasted-salmon', table: Number(queryTable) || 7,
  ownerTab: 'menu', filter: 'all', search: '', editor: null, modal: null,
  overviewScroll: 0, categoryScroll: 0, toast: '', filterScroll: 0,
  appearanceDraft: null, appearanceStatus: '', mediaDish: null, detailTab: 'allergens', viewAdded: false,
};
if (!db.tables.some(t => t.active && t.number === ui.table)) ui.table = db.tables.find(t => t.active)?.number ?? null;
if(embedMode)ui.surface=embedMode;
const root=document.getElementById('app');
let storageEnabled=true,toastTimer=null;
function save(){try{localStorage.setItem(DB_KEY,JSON.stringify(db));storageEnabled=true}catch(ex){storageEnabled=false;console.warn('Local storage not available',ex)}}
function dish(id){return db.dishes.find(d=>d.id===id)}
function allLive(){return db.dishes.filter(d=>d.live)}
function listed(){return allLive().filter(d=>(ui.category==='all'||d.category===ui.category)&&canShow(d))}
function chosen(){return listed().find(d=>d.id===ui.selected)||listed()[0]||null}
function currentCart(){const key=pad(ui.table);return db.carts[key]||{}}
function cartCount(){return Object.values(currentCart()).reduce((s,n)=>s+Number(n||0),0)}
function cartAmount(cart){return Object.entries(cart).reduce((cents,[id,qty])=>cents+Math.round((dish(id)?.price||0)*100)*qty,0)/100;}
function cartTotal(){return cartAmount(currentCart());}
function event(key,dishId) {
  db.events[key] = (db.events[key] || 0) + 1;
  if (key === 'views' || key === 'language') {
    db.events.byLanguage ??= {};
    db.events.byLanguage[ui.lang]=(Number(db.events.byLanguage[ui.lang])||0)+1;
  }
  if (key === 'views') {
    const now=new Date();const day=[now.getFullYear(),pad(now.getMonth()+1),pad(now.getDate())].join('-');
    db.events.byDay ??= {};db.events.byDay[day]=(Number(db.events.byDay[day])||0)+1;
    db.events.measuredViews++;
    ui.viewAdded = false;
  }
  if (key === 'adds' && !ui.viewAdded) {
    db.events.viewsWithAdd++;
    ui.viewAdded = true;
  }
  if (key === 'opens' && dishId) db.events.dishViews[dishId] = (db.events.dishViews[dishId] || 0) + 1;
  if (ui.table !== null) {
    const table = pad(ui.table);
    db.events.byTable[table] = (db.events.byTable[table] || 0) + 1;
  }
  save();
}
function setToast(s){ui.toast=s;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{ui.toast='';document.querySelector('.floating-toast')?.remove()},2800)}
function addToCart(id,n){if(ui.table===null || !dish(id))return;const k=pad(ui.table);const c=db.carts[k]||(db.carts[k]={});c[id]=Math.max(0,(Number(c[id])||0)+n);if(c[id]===0)delete c[id];if(n>0)event('adds',id);else save();setToast(n>0?tr('add'):tr('selection'));render()}

function icon(name){const paths={
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
 crop:'<path d="M6 2v16h16M2 6h16v16"/>',send:'<path d="m3 10 18-7-7 18-4-7-7-4Zm7 4L21 3"/>',
 drop:'<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',
 cake:'<path d="M3 10h18v11H3zM3 15c3-4 5 4 9 0s6 0 9 0M6 10V6h12v4M12 2v4"/>',
 dish:'<path d="M2 19h20M4 16a8 8 0 0 1 16 0H4ZM12 4v4M10 4h4"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18"/>',
 globe:'<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20M4 6h16M4 18h16"/>',
 pause:'<circle cx="12" cy="12" r="9"/><path d="M9 8v8M15 8v8"/>',percent:'<path d="m5 19 14-14"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/>',

 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM21 15h-2v4M15 21h3M21 21h-1"/>',
 chart:'<path d="M4 20V11M10 20V7M16 20V13M22 20V3"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a2 2 0 0 0 .4 2.2l-2 2a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.6 2H11a2 2 0 0 0-1.6-2 2 2 0 0 0-2.2.4l-2-2A2 2 0 0 0 5.6 15 2 2 0 0 0 3.6 13v-2a2 2 0 0 0 2-1.6 2 2 0 0 0-.4-2.2l2-2A2 2 0 0 0 9.4 5 2 2 0 0 0 11 3h3a2 2 0 0 0 1.6 2 2 2 0 0 0 2.2.4l2 2a2 2 0 0 0-.4 2.2A2 2 0 0 0 21.4 11v2A2 2 0 0 0 19.4 15Z"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 cart:'<path d="M3 4h2l2.2 11.2h12.5l2.2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',close:'<path d="M5 5l14 14M19 5 5 19"/>',chevron:'<path d="m9 18 6-6-6-6"/>',back:'<path d="m15 18-6-6 6-6"/>',
 spark:'<path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2ZM20 17l.7 2.3L23 20l-2.3.7L20 23l-.7-2.3L17 20l2.3-.7L20 17Z"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-6-6-9 11"/>',video:'<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 5-3v10l-5-3"/>',
 download:'<path d="M12 3v13m-4-4 4 4 4-4M5 18v3h14v-3"/>',copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
 star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3 1.2-6.8-5-4.9 6.9-1L12 2Z"/>', search:'<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 5 5"/>', wheat:'<path d="M12 3v18M9 6c0 1.5-1.1 2.4-2.5 3.4M9 10c0 1.5-1.1 2.4-2.5 3.4M15 6c0 1.5 1.1 2.4 2.5 3.4M15 10c0 1.5 1.1 2.4 2.5 3.4"/>', milk:'<path d="M9 3h6v3l2 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3V3Z"/><path d="M9 6h6"/>', egg:'<path d="M12 4c-3 3.2-5 6.3-5 9a5 5 0 0 0 10 0c0-2.7-2-5.8-5-9Z"/>', fish:'<path d="M3 12s3-4 8-4 8 4 8 4-3 4-8 4-8-4-8-4Z"/><circle cx="15.5" cy="11" r=".8"/><path d="M3 12 1.5 9.5v5L3 12Z"/>', nut:'<path d="M12 4c3 0 5 2.4 5 5.3 0 4.3-2.5 7.8-5 10.7-2.5-2.9-5-6.4-5-10.7C7 6.4 9 4 12 4Z"/>', shell:'<path d="M12 20c-4.2 0-7.5-3.5-7.5-7.9C4.5 8.2 7.8 5 12 5s7.5 3.2 7.5 7.1C19.5 16.5 16.2 20 12 20Z"/><path d="M12 7v11M8 10h8M6.5 13h11M8.5 16h7"/>', leaf:'<path d="M19 5c-7 0-12 4.5-12 11 4-2 6.8-3 12-3-2.5 2-4.7 4-6 6 6-.7 8-5.3 8-9.5C21 7.3 20.4 6 19 5Z"/>', seed:'<path d="M12 5c2 2 3.5 4.2 3.5 6.7A3.5 3.5 0 0 1 12 15.2a3.5 3.5 0 0 1-3.5-3.5C8.5 9.2 10 7 12 5Z"/><path d="M6 19c1.1-1.2 2.7-2 4.5-2.2M18 19c-1.1-1.2-2.7-2-4.5-2.2"/>',pencil:'<path d="m4 20 5-1 12-12-4-4L5 15l-1 5ZM14 6l4 4"/>',
 check:'<path d="m4 12 5 5L20 6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',table:'<path d="M4 9h16M6 9v11M18 9v11M5 5h14v4H5z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 filter:'<path d="M4 7h16M7 12h10M10 17h4"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>'};return `<svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.spark}</svg>`}

function topbar(){return `<header class="topbar"><div class="topbar-mark"><div class="topbar-brand">Foodie<small>by Atticoo</small></div></div><a class="restaurant-link" href="?restaurant=${restaurantProfile ? 'aurel-house' : 'mizora'}">${restaurantProfile ? 'Aurel House demo' : 'MIZORA demo'}</a><nav class="workspace-switch" aria-label="Preview workspace"><button class="${ui.surface==='guest'?'is-on':''}" data-act="surface" data-value="guest">Guest View</button><button class="${ui.surface==='owner'?'is-on':''}" data-act="surface" data-value="owner">Owner Control</button></nav><div class="topbar-status"><span class="status-dot"></span> Local preview <span class="desktop-only">· no live service</span></div></header>`}

const MIZORA_ALLERGENS = ['Gluten','Crustaceans','Eggs','Fish','Peanuts','Soy','Milk','Tree nuts','Celery','Mustard','Sesame','Sulphites','Lupin','Molluscs'];

function foodIcon(name) {
  const shapes = {
    Gluten:'<path d="M12 3v18M12 8C8 8 7 5 8 3c3 0 4 2 4 5Zm0 5c-4 0-6-3-5-5 3 0 5 2 5 5Zm0 5c-4 0-6-3-5-5 3 0 5 2 5 5Zm0-8c4 0 6-3 5-5-3 0-5 2-5 5Zm0 6c4 0 6-3 5-5-3 0-5 2-5 5Z"/>',
    Crustaceans:'<path d="M20 6c-5-3-10-1-11 3-3-1-6 0-6 3 0 2 2 3 4 2 0 5 5 7 9 4 2-2 1-5-2-5H9m1-4 2 2m2-5 1 3m4-3 1 3M4 8 2 6m5 1L6 4"/><circle cx="16" cy="12" r=".6"/>',
    Eggs:'<path d="M12 3c-4 0-7 8-7 12a7 7 0 0 0 14 0c0-4-3-12-7-12Z"/>',
    Fish:'<path d="M17 9C12 4 5 6 2 12c3 6 10 8 15 3l5 4V5l-5 4ZM8 7c3 3 3 7 0 10m3-10 2-3 3 4m-5 9 2 3 2-4"/><circle cx="5.5" cy="11" r=".8" fill="currentColor" stroke="none"/>',
    Peanuts:'<path d="M13 3c-3-2-7 0-7 3 0 2 1 3 0 5-1 2-4 3-3 6 1 4 6 5 9 2 2-2 1-4 2-6s4-2 5-5c1-3-2-6-6-5Z"/><path d="m10 5 2 2m-3 2 2 2m-5 4 2 2m2-4 2 2m2-9 2 2"/>',
    Soy:'<path d="M4 21C2 13 10 5 20 3c1 10-5 18-16 18Zm0 0L20 3"/><ellipse cx="10" cy="14" rx="2" ry="2.5" transform="rotate(40 10 14)"/><ellipse cx="16" cy="8" rx="1.6" ry="2" transform="rotate(40 16 8)"/>',
    Milk:'<path d="M9 3h6v4l3 4v10H6V11l3-4V3Zm0 4h6M6 14h12"/>',
    'Tree nuts':'<path d="M5 10h14c0 7-4 11-7 12-3-1-7-5-7-12ZM4 10c0-5 16-5 16 0H4Zm8-5V2"/>',
    Celery:'<path d="M10 21 7 4m5 17V4m2 17 3-17M7 7C2 8 2 4 5 3m7 4c-4-1-4-4-1-5m6 5c5 0 5-4 2-5"/>',
    Mustard:'<path d="M10 2h4v4h-4zM8 6h8v4H8zM7 10h10v12H7zM7 15h10"/>',
    Sesame:'<ellipse cx="7" cy="6" rx="2" ry="3" transform="rotate(-25 7 6)"/><ellipse cx="16" cy="7" rx="2" ry="3" transform="rotate(35 16 7)"/><ellipse cx="6" cy="16" rx="2" ry="3" transform="rotate(-30 6 16)"/><ellipse cx="16" cy="17" rx="2" ry="3" transform="rotate(30 16 17)"/>',
    Sulphites:'<path d="M8 3h8v6c0 6-8 6-8 0V3Zm0 5h8m-4 5v8m-4 0h8"/>',
    Lupin:'<path d="M12 21V3m0 14c-5 0-7-3-7-5 5 0 7 2 7 5Zm0-4c5 0 7-3 7-5-5 0-7 2-7 5Z"/><circle cx="10" cy="4" r="1.8"/><circle cx="14" cy="7" r="1.8"/><circle cx="9" cy="9" r="1.8"/>',
    Molluscs:'<path d="M12 21 3 12C-1 2 25 2 21 12l-9 9Zm0 0V6m0 15L7 7m5 14 5-14M7 21h10"/>',
    vegetarian:'<path d="M5 20C3 8 11 4 21 3c0 10-4 17-13 15M5 20l11-11"/>',
    vegan:'<path d="M12 22V9m0 5C3 14 2 9 3 5c7 0 9 4 9 9Zm0-4c0-6 4-8 9-8 0 7-3 9-9 8Z"/>',
    halal:'<path d="M17 3a9 9 0 1 0 4 14A8 8 0 0 1 17 3Z"/><path d="m16 10 2 2 4-4"/>',
    chili:'<path d="M16 6c-2-4 0-5 3-5m-6 6 5 2m-5-4c-3 1-3 5-5 8-2 3-5 4-7 4 4 6 11 4 14-1 3-4 6-8 3-10-2-2-3-2-5-1Z"/>',
    anyHeat:'<path d="M12 8c-4-6-10-2-10 2s6 8 10 2c4-6 10-2 10 2s-6 8-10 2"/>',
    unknown:'<circle cx="12" cy="12" r="9"/><path d="M12 6v7m0 4h.01"/>',
    energy:'<path d="m13 2-8 12h6l-1 8 9-12h-6l1-8Z"/>',
    explore:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
    overview:'<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>',
    cart:'<path d="M5 7h14l1 14H4L5 7Zm4 0V5a3 3 0 0 1 6 0v2"/>',
  };
  let shape=shapes[name];
  if(name==='glutenFree')shape=shapes.Gluten+'<path d="M2 2 22 22"/>';
  if(name==='lactoseFree')shape=shapes.Milk+'<path d="M2 2 22 22"/>';
  if(!shape)return icon(name);
  return `<svg class="food-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;
}

const GUEST_LANGUAGES = [
  {id:'en',name:'English',flag:'gb'},
  {id:'de',name:'Deutsch',flag:'de'},
  {id:'es',name:'Español',flag:'es'},
];

function languageFlag(language) {
  const option=GUEST_LANGUAGES.find(item=>item.id===language)||GUEST_LANGUAGES[0];
  return `<img class="language-flag" src="assets/flags/${option.flag}.svg" width="24" height="18" alt="" aria-hidden="true">`;
}

function mizoraHeader() {
  const explore=ui.mode==='explore';
  const language=GUEST_LANGUAGES.find(item=>item.id===ui.lang);
  const header=`<header class="restaurant-header compact-guest-header">
    ${!explore?'<div class="mizora-logo"><img src="assets/mizora/logo-transparent.png" alt="MIZORA"></div>':''}
    <div class="guest-header-tools">${!explore?`<button class="guest-information-trigger" data-act="guest-information" aria-label="${e(ui.lang==='de'?'Restaurantmenü':ui.lang==='es'?'Menú del restaurante':'Restaurant menu')}" aria-haspopup="dialog" aria-expanded="${ui.modal==='guest-information'}">${icon('menu')}</button>`:''}<button class="lang-pill language-flag-control" data-act="language" aria-label="${e(tr('language')+' · '+language.name)}" aria-haspopup="dialog" aria-expanded="${ui.modal==='language'}">${languageFlag(ui.lang)}</button></div>
  </header>`;
  const categories=`<nav class="quick-tabs" id="quick-tabs" aria-label="${e(tr('category'))}">${CATS.map(c=>`<button class="quick-tab ${ui.category===c.id?'is-active':''}" data-act="category" data-value="${c.id}" aria-pressed="${ui.category===c.id}">${e(catLabel(c.id))}</button>`).join('')}</nav>`;
  return `<div class="guest-status"><span>9:41</span><div class="island"></div><span>▥ ◕ ▰</span></div>${explore?categories+header:header+categories}`;
}

function mizoraDock() {
  const cartLabel={en:'Cart',de:'Warenkorb',es:'Cesta'}[ui.lang];
  return `<nav class="guest-cartbar mizora-dock" aria-label="${e(tr('selection'))}">
    ${[['explore',tr('explore'),'mode'],['overview',tr('overview'),'mode'],['filters',tr('filters'),'filters'],['cart',cartLabel,'cart']].map(([id,label,action])=>{
      const selected=ui.modal ? ui.modal===id : ui.mode===id;
      const badge=id==='cart'?cartCount():id==='filters'?activeFilterCount():0;
      return `<button data-act="${action}" ${action==='mode'?`data-value="${id}"`:''} class="${selected?'is-active':''}" aria-label="${e(label)}${badge?' ('+badge+')':''}" aria-pressed="${selected}"><span class="dock-icon">${id==='filters'?icon('filter'):foodIcon(id)}${badge?`<b class="dock-badge">${badge}</b>`:''}</span><span>${e(label)}</span></button>`;
    }).join('')}</nav>`;
}

function mizoraDishInformation(d) {
  const kcal=d.nutrition?.kcal;
  const label=Number.isFinite(kcal)?'≈ '+new Intl.NumberFormat(ui.lang,{maximumFractionDigits:0}).format(kcal)+' kcal':tr('nutrition');
  const allergens=d.allergens || [];
  return `<div class="dish-information"><button class="nutrition-peek" data-act="nutrition" aria-label="${e(tr('nutrition')+' · '+label)}">${foodIcon('energy')}<span>${e(label)}</span></button>
    <span class="allergen-peek" role="img" aria-label="${e(tr('allergens')+': '+(allergens.map(allergenName).join(', ') || tr('allergenNotVerified')))}" title="${e(allergens.map(allergenName).join(', ') || tr('allergenNotVerified'))}">
      ${allergens.length?allergens.slice(0,4).map(a=>`<span data-value="${e(a)}" title="${e(allergenName(a))}">${foodIcon(a)}</span>`).join(''):foodIcon('unknown')}
      ${allergens.length===1?`<span>${e(allergenName(allergens[0]))}</span>`:''}${allergens.length>4?`<span>+${allergens.length-4}</span>`:''}
    </span><button class="dish-add" ${ui.table===null?'disabled':''} data-act="add" data-id="${e(d.id)}" aria-label="${e(tr('add')+' '+dishText(d,'name'))}">${icon('cart')}<span class="dish-add-plus">+</span>${currentCart()[d.id]?`<b>${currentCart()[d.id]}</b>`:''}</button></div>`;
}

function headerGuest(){if(restaurantProfile)return mizoraHeader();return `<div class="guest-status"><span>9:41</span><div class="island"></div><span>▥  ◕  ▰</span></div><div class="restaurant-header"><button class="glass-icon" data-act="guest-back" title="${e(tr('overview'))}" aria-label="${e(tr('overview'))}">${icon('menu')}</button><div class="rest-brand">${restaurantProfile ? '<div class="mizora-logo"><img src="assets/mizora/logo-transparent.png" alt="MIZORA · Mediterranean · Japanese"></div>' : '<span class="rest-symbol">∿</span><strong>'+e(db.restaurant)+'</strong><small>'+e(db.tagline)+'</small>'}</div><div class="guest-header-tools">${db.reviewEnabled!==false?`<button class="glass-icon review-top-icon" data-act="review" title="${e(tr('reviewEntry'))}" aria-label="${e(tr('reviewEntry'))}">${icon('star')}</button>`:''}<button class="lang-pill" data-act="language" aria-label="${e(tr('language'))}">${ui.lang.toUpperCase()} ⌄</button></div></div><div class="quick-tabs" id="quick-tabs" aria-label="${e(tr('category'))}">${CATS.map(c=>`<button class="quick-tab ${ui.category===c.id?'is-active':''}" data-act="category" data-value="${c.id}">${e(catLabel(c.id))}</button>`).join('')}</div><div class="guest-toggle"><button class="${ui.mode==='explore'?'active':''}" data-act="mode" data-value="explore">${icon('spark')} ${e(tr('explore'))}</button><button class="${ui.mode==='overview'?'active':''}" data-act="mode" data-value="overview">${icon('menu')} ${e(tr('overview'))}</button><button class="filter-launch ${activeFilterCount()?'filter-on':''}" data-act="filters" aria-label="${e(tr('filters'))}">${icon('filter')}<span>${e(tr('filters'))}</span>${activeFilterCount()?`<b>${activeFilterCount()}</b>`:''}</button></div>`}

function guestCartBar(){if(restaurantProfile)return mizoraDock();return `<div class="guest-cartbar"><button class="table-cart" data-act="tables" aria-label="${e(tr('changeTable'))}">${icon('cart')}<span><b>${ui.table === null ? e(tr('noTable')) : e(tr('changeTable')) + ' ' + pad(ui.table)}</b><small>${cartCount()} ${e(tr('items'))} · ${fmt(cartTotal())}</small></span></button><button class="cart-action" data-act="cart">${e(tr('viewCart'))} ${icon('arrow')}</button></div>`}

function heroExplore(){
 const d=chosen();
 if(!d) return `<div class="guest-hero-empty"><h2>${e(tr('noMatches'))}</h2><button class="outline-pill" data-act="clear-filters">${e(tr('resetFilters'))}</button></div>`;
 const qty=Number(currentCart()[d.id]||0);
 return `<div class="explore-hero">
   ${dishPhoto(d,'explore',{className:'hero-image',alt:dishText(d,'name'),position:EXPLORE_FOCUS[d.id] || 'center center'})}
   <div class="hero-shade"></div>
   ${restaurantProfile?'':`<div class="hero-fab-stack"><button class="fab-cart-add" ${ui.table === null ? 'disabled' : ''} data-act="add" data-id="${e(d.id)}" aria-label="${e(tr('add'))} ${e(dishText(d,'name'))}">${icon('cart')}<span class="fab-plus">+</span>${qty?`<b>${qty}</b>`:''}</button></div>`}
   <div class="hero-content hero-content-minimal">
     <div class="hero-kicker"><span>${e(catLabel(d.category))}</span><div class="explore-navigation"><button type="button" data-act="previous-dish" aria-label="${e(tr('previousDish'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><span class="swipe-indicator">${e(tr('swipe'))}</span><button type="button" data-act="next-dish" aria-label="${e(tr('nextDish'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div></div>
     <div class="hero-title-row"><h1>${e(dishText(d,'name'))}${d.raw?'<sup class="raw-mark">*</sup>':''}</h1><span class="hero-price">${fmt(d.price)}</span></div>
     <p class="hero-summary">${e(dishText(d,'summary'))}</p>
     ${restaurantProfile?mizoraDishInformation(d):`<div class="hero-subline"><button class="outline-pill details-pill" data-act="details" aria-label="${e(tr('details'))} ${e(dishText(d,'name'))}">${icon('eye')} ${e(tr('details'))}</button></div>`}
   </div>
 </div>`;
}
function dishCard(d){const qty=currentCart()[d.id]||0;return `<article class="dish-card"><button class="dish-card-main" data-act="open" data-id="${e(d.id)}" aria-label="${e(tr('explore'))} ${e(dishText(d,'name'))}">${dishPhoto(d,'overview',{lazy:true})}<span class="dish-card-copy"><strong>${e(dishText(d,'name'))}</strong><small>${e(dishText(d,'summary'))}</small><em>${fmt(d.price)}</em></span></button><span class="dish-card-actions">${qty?`<button class="tiny-round" aria-label="− ${e(dishText(d,'name'))}" data-act="decrease" data-id="${e(d.id)}">${icon('minus')}</button><b>${qty}</b>`:''}<button class="tiny-round emphasis" ${ui.table === null ? 'disabled' : ''} aria-label="${e(tr('add') + ' ' + dishText(d,'name'))}" data-act="add" data-id="${e(d.id)}">${icon('plus')}</button></span></article>`}


function mizoraCard(d) {
  const quantity=currentCart()[d.id] || 0;
  const matches=(ui.category==='all'||d.category===ui.category)&&canShow(d);
  const disabled=matches?'':'disabled';
  const kcal=d.nutrition?.kcal;
  return `<article class="dish-card menu-photo-card ${matches?'':'is-muted'}" ${matches?'':'aria-describedby="muted-dish-note"'}>
    <button class="dish-card-main" data-act="open" data-id="${e(d.id)}" ${disabled} aria-label="${e(tr('explore')+' '+dishText(d,'name'))}">
      <span class="menu-card-photo">${dishPhoto(d,'overview',{lazy:true})}<em>${fmt(d.price)}</em>${quantity?`<b class="card-quantity">${quantity}</b>`:''}</span>
      <span class="dish-card-copy"><strong>${e(dishText(d,'name'))}${d.raw?'<sup class="raw-mark">*</sup>':''}</strong>${Number.isFinite(kcal)?`<small>≈ ${e(kcal)} kcal</small>`:''}</span>
    </button><button class="card-quick-add" ${!matches||ui.table===null?'disabled':''} aria-label="${e(tr('add')+' '+dishText(d,'name'))}" data-act="add" data-id="${e(d.id)}">${icon('plus')}</button>
  </article>`;
}

function mizoraOverview() {
  const matchingIds=new Set(listed().map(d=>d.id));
  const live=allLive();
  const dishes=[...live.filter(d=>matchingIds.has(d.id)),...live.filter(d=>!matchingIds.has(d.id))];
  const matches=matchingIds.size;
  const labels={
    en:{count:'matching dishes',muted:'Black-and-white dishes do not match the selected filters. Clear filters to select them.'},
    de:{count:'passende Gerichte',muted:'Schwarzweiß dargestellte Gerichte entsprechen nicht den Filtern. Zum Auswählen die Filter zurücksetzen.'},
    es:{count:'platos coincidentes',muted:'Los platos en blanco y negro no coinciden con los filtros. Borra los filtros para seleccionarlos.'},
  }[ui.lang];
  return `<div class="overview-scroll venue-menu compact-menu" id="overview-scroll">
    <div class="compact-menu-status" role="status">${activeFilterCount()?`<span>${matches} / ${dishes.length} ${e(labels.count)}</span><button data-act="clear-filters">${e(tr('clear'))}</button>`:`<span>${dishes.length} ${e(tr('selections'))}</span>`}</div>
    <p class="visually-hidden" id="muted-dish-note">${e(labels.muted)}</p>
    ${!matches&&activeFilterCount()?`<p class="no-match-note">${e(tr('noMatches'))}</p>`:''}
    <div class="menu-photo-grid">${dishes.map(mizoraCard).join('')}</div>
    <p class="overview-disclaimer">${e(tr('demoMenu'))}</p></div>`;
}
function guestOverview(){if(restaurantProfile)return mizoraOverview();const l=listed();return `<div class="overview-scroll" id="overview-scroll"><div class="overview-title"><div><div class="micro-overline">${e(db.restaurant)} / MENU</div><h1>${e(tr('onMenu'))}<span>.</span></h1></div><span class="overview-count">${l.length} ${e(tr('selections'))}</span></div>${activeFilterCount()?`<div class="results-warning">${icon('filter')} ${e(tr('demoWarning'))}</div>`:''}${l.length?l.map(d=>dishCard(d)).join(''):`<div class="no-results"><p>${e(tr('noMatches'))}</p><button class="outline-btn" data-act="clear-filters">${e(tr('resetFilters'))}</button></div>`}<p class="overview-disclaimer">${e(tr('demoMenu'))}</p></div>`}

function calorieFilter() {
  return `<fieldset class="filter-group calorie-filter"><legend>${e(tr('calorieLimit'))}</legend>
    <div class="filter-chip-grid">${[null,...CALORIE_LIMITS].map(limit => `<button type="button" class="filter-chip ${ui.guestFilters.calorie === limit ? 'chosen' : ''}" data-act="set-calorie" data-value="${limit ?? 'any'}" aria-pressed="${ui.guestFilters.calorie === limit}">${e(limit === null ? tr('anyCalories') : tr('underCalories').replace('{limit}',limit))}</button>`).join('')}</div>
    <p>${e(tr('calorieNote'))}</p></fieldset>`;
}

function nutritionPanel(d) {
  const data = d.nutrition;
  const format = new Intl.NumberFormat(ui.lang, { maximumFractionDigits: 1 });
  const rows = nutritionFields.map(({key,unit}) => {
    const value = data?.[key];
    return `<div><dt>${e(tr(key))}</dt><dd>${Number.isFinite(value) ? e(format.format(value) + ' ' + unit) : e(tr('unavailable'))}</dd></div>`;
  });
  const serving = restaurantProfile && data?.source === 'sample'
    ? (d.id === 'mizora-14' ? ({en:'Whole fish · for sharing',de:'Ganzer Fisch · zum Teilen',es:'Pescado entero · para compartir'}[ui.lang])
      : ({en:'1 assumed menu portion',de:'1 angenommene Menüportion',es:'1 ración supuesta del menú'}[ui.lang]))
    : data?.serving;
  return `${data ? `<p class="nutrition-source">${e(tr(data.source === 'sample' ? 'sampleNutrition' : 'enteredNutrition'))}</p>` : ''}
    <dl class="nutrition-values">${rows.join('')}<div><dt>${e(tr('serving'))}</dt><dd>${e(serving || tr('unavailable'))}</dd></div></dl>
    <p class="allergen-card-note">${e(tr('nutritionNote'))}</p>`;
}




function mizoraFilters() {
  const option=(action,value,label,glyph,selected)=>`<button type="button" class="icon-filter ${selected?'is-selected':''}" data-act="${action}" data-value="${e(value)}" aria-pressed="${selected}" aria-label="${e(label)}" title="${e(label)}">${glyph}<span>${e(label)}</span></button>`;
  return `<div class="guest-modal-backdrop" data-act="close-modal"><section class="guest-sheet filters-sheet icon-filter-sheet mizora-sheet" role="dialog" aria-modal="true" aria-label="${e(tr('filters'))}">
    <div class="sheet-handle"></div><header class="sheet-head"><h2>${e(tr('filters'))}</h2><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></header>
    <div class="filter-scroll">
      <fieldset class="icon-filter-group"><legend>${e(tr('preferences'))}</legend><div class="diet-icon-grid">${DIET_KEYS.map(key=>option('toggle-diet',key,tr(key),foodIcon(key),!!ui.guestFilters[key])).join('')}</div></fieldset>
      <div class="energy-heat-grid"><fieldset class="icon-filter-group"><legend>${e(tr('calorieLimit'))}</legend><div class="energy-options">${[null,...CALORIE_LIMITS].map(value=>`<button data-act="set-calorie" data-value="${value??'any'}" aria-pressed="${ui.guestFilters.calorie===value}" aria-label="${e(value===null?tr('anyCalories'):tr('underCalories').replace('{limit}',value))}">${value===null?'∞':'< '+value}</button>`).join('')}</div></fieldset>
      <fieldset class="icon-filter-group"><legend>${e(tr('spiceLevel'))}</legend><div class="chili-options">${[[null,'noSpiceLimit'],[0,'mild'],[1,'medium'],[2,'hot']].map(([value,key])=>`<button data-act="set-spice" data-value="${value??'any'}" aria-pressed="${ui.guestFilters.spice===value}" aria-label="${e(tr(key))}" title="${e(tr(key))}">${value===null?foodIcon('anyHeat'):Array.from({length:value+1},()=>foodIcon('chili')).join('')}</button>`).join('')}</div></fieldset></div>
      <fieldset class="icon-filter-group"><legend>${e(tr('allergyExclude'))}</legend><div class="allergen-icon-grid">${MIZORA_ALLERGENS.map(a=>option('toggle-allergen',a,allergenName(a),foodIcon(a),ui.guestFilters.exclude.includes(a))).join('')}</div></fieldset>
      <p class="filter-warning">${e(tr('demoWarning'))}</p>
    </div><footer class="filter-sheet-actions"><button class="filter-reset" data-act="clear-filters">${e(tr('clear'))}${activeFilterCount()?` (${activeFilterCount()})`:''}</button><button class="primary-btn" data-act="apply-filters">${e(tr('apply'))}<span>${listed().length}</span>${icon('arrow')}</button></footer>
  </section></div>`;
}
function mizoraNutrition(d) {
  const data=d.nutrition;
  const format=new Intl.NumberFormat(ui.lang,{maximumFractionDigits:1});
  const estimated={en:'Estimate',de:'Geschätzt',es:'Estimación'}[ui.lang];
  const note=d.id==='mizora-14'?{en:'Approximate values · whole fish, for sharing',de:'Ungefähre Werte · ganzer Fisch zum Teilen',es:'Valores aproximados · pescado entero para compartir'}[ui.lang]:{en:'Approximate values per portion',de:'Ungefähre Werte pro Portion',es:'Valores aproximados por ración'}[ui.lang];
  return `<div class="guest-modal-backdrop nutrition-backdrop" data-act="close-modal"><section class="nutrition-card" role="dialog" aria-modal="true" aria-label="${e(tr('nutrition')+' · '+dishText(d,'name'))}">
    <header><strong class="nutrition-total">${foodIcon('energy')}${Number.isFinite(data?.kcal)?'≈ '+e(format.format(data.kcal))+' kcal':e(tr('unavailable'))}</strong><span class="nutrition-source">${e(estimated)}</span><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></header>
    <dl class="nutrition-values">${['protein','carbs','fat'].map(key=>`<div><dt>${e(tr(key))}</dt><dd>${Number.isFinite(data?.[key])?e(format.format(data[key]))+' g':e(tr('unavailable'))}</dd></div>`).join('')}</dl><p>${e(note)}</p>
  </section></div>`;
}

const MIZORA_CART_COPY = {
  en:{subtotal:'Subtotal',item:'item',items:'items',empty:'Your selection starts here',remove:'Remove one',reviewLabel:'Your experience',reviewTitle:'Review on Google',reviewHeading:'How was your visit?',reviewCopy:'Share your experience at MIZORA.',reviewUnavailable:'Reviews are currently unavailable.',reviewOpen:'Continue to Google',back:'Back to selection'},
  de:{subtotal:'Zwischensumme',item:'Artikel',items:'Artikel',empty:'Hier beginnt deine Auswahl',remove:'Einmal entfernen',reviewLabel:'Dein Erlebnis',reviewTitle:'Bei Google bewerten',reviewHeading:'Wie war dein Besuch?',reviewCopy:'Teile dein Erlebnis bei MIZORA.',reviewUnavailable:'Bewertungen sind derzeit nicht verfügbar.',reviewOpen:'Weiter zu Google',back:'Zurück zur Auswahl'},
  es:{subtotal:'Subtotal',item:'artículo',items:'artículos',empty:'Tu selección empieza aquí',remove:'Quitar uno',reviewLabel:'Tu experiencia',reviewTitle:'Valorar en Google',reviewHeading:'¿Qué tal tu visita?',reviewCopy:'Comparte tu experiencia en MIZORA.',reviewUnavailable:'Las reseñas no están disponibles en este momento.',reviewOpen:'Continuar a Google',back:'Volver a la selección'},
};

function googleBrandMark() {
  return '<img class="google-brand-mark" src="assets/brands/google-g.png" width="72" height="72" alt="Google">';
}

const MIZORA_SHEET_COPY = {
  en:{information:'Restaurant information',tablePreview:'Local preview · switch between tables',backLanguages:'Back to languages'},
  de:{information:'Restaurantinformationen',tablePreview:'Lokale Vorschau · zwischen Tischen wechseln',backLanguages:'Zurück zur Sprachauswahl'},
  es:{information:'Información del restaurante',tablePreview:'Vista previa local · cambiar de mesa',backLanguages:'Volver a los idiomas'},
};

const INFORMATION_COPY={
  en:{title:'At MIZORA',reviews:'Google reviews',events:'Events',empty:'No events announced yet.',unavailable:'Currently unavailable',back:'Back to restaurant menu'},
  de:{title:'Bei MIZORA',reviews:'Google-Bewertungen',events:'Events',empty:'Noch keine Events angekündigt.',unavailable:'Derzeit nicht verfügbar',back:'Zurück zum Restaurantmenü'},
  es:{title:'En MIZORA',reviews:'Reseñas en Google',events:'Eventos',empty:'Aún no hay eventos anunciados.',unavailable:'No disponible actualmente',back:'Volver al menú del restaurante'},
};

function validInstagramUrl(value) {
  try {const url=new URL(value);return url.protocol==='https:'&&['instagram.com','www.instagram.com'].includes(url.hostname)&&!url.username&&!url.password&&!url.port;}catch{return false;}
}
function eventDateLabel(item) {
  const date=new Date(item.date+'T12:00:00');
  return Number.isNaN(date.getTime())?item.date:new Intl.DateTimeFormat(ui.lang,{day:'numeric',month:'short',year:'numeric'}).format(date)+(item.time?' · '+item.time:'');
}
function mizoraInformation() {
  const copy=INFORMATION_COPY[ui.lang];
  const events=db.restaurantEvents.filter(item=>item.published).slice().sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
  const instagram='<span class="instagram-symbol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg></span>';
  return `<div class="guest-modal-backdrop" data-act="close-modal"><section class="guest-sheet filters-sheet icon-filter-sheet mizora-sheet restaurant-information-sheet" role="dialog" aria-modal="true" aria-label="${e(copy.title)}">
    <div class="sheet-handle"></div><header class="sheet-head"><h2>${e(copy.title)}</h2><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></header>
    <div class="restaurant-information-scroll"><nav class="restaurant-channels" aria-label="${e(copy.title)}">
      ${validInstagramUrl(db.instagramUrl)?`<a class="restaurant-channel" href="${e(db.instagramUrl)}" target="_blank" rel="noopener noreferrer">${instagram}<span>Instagram</span>${icon('arrow')}</a>`:`<div class="restaurant-channel is-unavailable">${instagram}<span>Instagram<small>${e(copy.unavailable)}</small></span></div>`}
      ${db.reviewEnabled!==false?`<button class="restaurant-channel" data-act="review">${googleBrandMark()}<span>${e(copy.reviews)}</span>${icon('arrow')}</button>`:''}</nav>
      <section class="guest-events"><h3>${e(copy.events)}</h3>${events.length?events.map(item=>`<article class="guest-event"><time datetime="${e(item.date)}">${e(eventDateLabel(item))}</time><h4>${e(item.title)}</h4>${item.description?`<p>${e(item.description)}</p>`:''}</article>`).join(''):`<p class="guest-events-empty">${e(copy.empty)}</p>`}</section>
    </div></section></div>`;
}

function localToday(){const now=new Date();return [now.getFullYear(),pad(now.getMonth()+1),pad(now.getDate())].join('-');}
function eventTiming(item){try{return eventPhase(item.date,localToday());}catch{return 'review';}}
function ownerEvents() {
  const current=ui.eventDraft||db.restaurantEvents.find(item=>item.id===ui.eventEditor)||{title:'',date:'',time:'',description:'',published:true};
  const filter=ui.eventFilter||'all';
  const items=db.restaurantEvents.slice().sort((a,b)=>a.date.localeCompare(b.date)).filter(item=>filter==='all'||eventTiming(item)===filter);
  const preview=db.restaurantEvents.find(item=>item.id===ui.eventEditor);
  return `${ownerToolbar('Events','Create and manage special events and announcements in your guest menu.')}
    <div class="owner-events-layout"><section class="panel events-library"><div class="panel-top"><h2>Restaurant events <small class="data-tag">${db.restaurantEvents.length} events</small></h2><button class="primary-btn copper-btn" data-act="new-event">${icon('plus')} New event</button></div>
    <nav class="status-tabs event-filters" aria-label="Event timing">${[['all','All'],['upcoming','Upcoming'],['today','Today'],['past','Past']].map(([key,label])=>`<button data-act="event-filter" data-value="${key}" aria-pressed="${filter===key}">${label}</button>`).join('')}</nav>
    <div class="event-list">${items.length?items.map(item=>`<article class="owner-event-row ${ui.eventEditor===item.id?'is-selected':''}"><button class="event-open" data-act="edit-event" data-id="${e(item.id)}"><time class="event-date-tile" datetime="${e(item.date)}"><b>${e(item.date.slice(8))}</b><span>${e(new Date(item.date+'T12:00:00').toLocaleDateString('en',{month:'short'}))}</span></time><span class="event-row-copy"><strong>${e(item.title)}</strong><small>${icon('calendar')} ${e(eventDateLabel(item))}</small><span class="event-publication">${item.published?'Visible in guest menu':'Hidden from guest menu'}</span></span></button><span class="event-timing ${eventTiming(item)}">${({upcoming:'Upcoming',today:'Today',past:'Past',review:'Check date'})[eventTiming(item)]}</span><button class="availability-switch" role="switch" aria-checked="${item.published}" aria-label="Publish · ${e(item.title)}" data-act="toggle-event" data-id="${e(item.id)}"><span></span></button><button class="icon-close" data-act="delete-event" data-id="${e(item.id)}" aria-label="Delete ${e(item.title)}">${icon('close')}</button></article>`).join(''):`<div class="events-empty">${icon('calendar')}<h3>${db.restaurantEvents.length?'No events in this view':'Your next occasion starts here'}</h3><p>${db.restaurantEvents.length?'Choose another timing filter to see your saved events.':'Create an event, add the details and choose when it appears in your guest menu.'}</p><small>No events have been added to this view.</small></div>`}</div></section>
    <form class="panel owner-event-form" id="event-form"><h2>${current.id?'Edit event':'New event'}</h2><p class="form-intro">An invitation, thoughtfully presented.</p><label class="form-field">Event title<input name="title" required maxlength="80" placeholder="Name your event" value="${e(current.title)}"></label><div class="editor-two"><label class="form-field">Date<input type="date" name="date" required min="1900-01-01" max="9999-12-31" value="${e(current.date)}"></label><label class="form-field">Time (optional)<input type="time" name="time" value="${e(current.time)}"></label></div><label class="form-field">Description<textarea name="description" maxlength="600" rows="5" placeholder="Tell guests what to expect…">${e(current.description)}</textarea></label><label class="review-enabled"><input name="published" type="checkbox" ${current.published?'checked':''}> Show in guest menu</label><p class="settings-hint">Visibility is separate from event timing. Upcoming events can be visible before their date.</p><div class="event-form-actions"><button class="primary-btn" type="submit">${icon('check')} Save event</button><button class="secondary-btn" type="button" data-act="new-event">Cancel</button></div><p class="settings-hint">Saved locally for this restaurant. Nothing is published externally.</p>
    <section class="event-guest-preview" aria-label="Saved guest preview"><div class="panel-top"><h3>Guest preview</h3><span class="data-tag">Saved content</span></div>${preview?`<article class="guest-event"><time datetime="${e(preview.date)}">${e(eventDateLabel(preview))}</time><h4>${e(preview.title)}</h4>${preview.description?`<p>${e(preview.description)}</p>`:''}</article><small>${preview.published?'This event appears in your local guest menu.':'Hidden from guests. Enable visibility and save to show it.'}</small>`:'<p>Save your event to preview the exact title, date and description shown to guests.</p>'}</section></form></div>`;
}

function mizoraLanguage() {
  const copy=MIZORA_SHEET_COPY[ui.lang];
  return `<div class="guest-modal-backdrop" data-act="close-modal"><section class="guest-sheet filters-sheet icon-filter-sheet mizora-sheet language-sheet" role="dialog" aria-modal="true" aria-label="${e(tr('switchLanguage'))}">
    <div class="sheet-handle"></div><header class="sheet-head"><h2>${e(tr('switchLanguage'))}</h2><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></header>
    <div class="language-choices" role="group" aria-label="${e(tr('language'))}">${GUEST_LANGUAGES.map(({id,name})=>`<button data-act="set-language" data-value="${id}" aria-label="${e(name)}" title="${e(name)}" aria-pressed="${ui.lang===id}">${languageFlag(id)}<span class="language-code" aria-hidden="true">${id}</span></button>`).join('')}</div>
  </section></div>`;
}

function mizoraTables() {
  const copy=MIZORA_SHEET_COPY[ui.lang];
  return `<div class="guest-modal-backdrop" data-act="close-modal"><section class="guest-sheet filters-sheet icon-filter-sheet mizora-sheet mizora-table-sheet" role="dialog" aria-modal="true" aria-label="${e(tr('changeTableTitle'))}" aria-describedby="table-preview-note">
    <div class="sheet-handle"></div><header class="sheet-head"><h2>${e(tr('changeTableTitle'))}</h2><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></header>
    <p class="table-preview-note" id="table-preview-note">${e(copy.tablePreview)}</p><div class="table-pick-grid" role="group" aria-label="${e(tr('changeTableTitle'))}">${db.tables.map(t=>`<button class="${t.number===ui.table?'active':''}" data-act="set-table" data-value="${t.number}" aria-pressed="${t.number===ui.table}" ${t.active?'':'disabled'}>${e(tr('changeTable'))}<strong>${pad(t.number)}</strong></button>`).join('')}</div>
    <footer class="filter-sheet-actions"><button class="table-return" data-act="cart">${icon('back')}${e(MIZORA_CART_COPY[ui.lang].back)}</button></footer>
  </section></div>`;
}

function mizoraCart() {
  const copy=MIZORA_CART_COPY[ui.lang];
  const items=Object.entries(currentCart()).filter(([id,quantity])=>quantity>0&&dish(id));
  const count=cartCount();
  return `<div class="guest-modal-backdrop cart-backdrop" data-act="close-modal"><section class="guest-sheet mizora-sheet mizora-cart-sheet" role="dialog" aria-modal="true" aria-label="${e(tr('selection'))}">
    <div class="sheet-handle"></div><header class="sheet-head"><div><button class="cart-table-link" data-act="tables" aria-haspopup="dialog" aria-label="${e(tr('changeTableTitle'))}${ui.table===null?'':' · '+pad(ui.table)}"><span>${e(tr('changeTable'))}</span><strong>${ui.table===null?'—':pad(ui.table)}</strong>${icon('chevron')}</button><h2>${e(tr('selection'))}</h2><p class="cart-item-count">${count} ${e(count===1?copy.item:copy.items)}</p></div><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></header>
    <div class="cart-items">${items.length?items.map(([id,quantity])=>{const d=dish(id);const name=dishText(d,'name');return `<article class="cart-item">${dishPhoto(d,'overview',{alt:name})}<div class="cart-item-detail"><strong>${e(name)}</strong><span>${fmt(d.price)} ${e(tr('each'))}</span><div class="quantity" role="group" aria-label="${e(name)}"><button data-act="decrease" data-id="${e(id)}" aria-label="${e(copy.remove+' · '+name)}">${icon('minus')}</button><b>${quantity}</b><button data-act="add" data-id="${e(id)}" aria-label="${e(tr('add')+' · '+name)}">${icon('plus')}</button></div></div><b>${fmt(quantity*d.price)}</b></article>`;}).join(''):`<div class="empty-cart">${foodIcon('cart')}<h3>${e(copy.empty)}</h3><p>${e(tr('emptyCart'))}</p></div>`}</div>
    <footer class="cart-footer"><div class="sheet-total"><span>${e(copy.subtotal)}</span><strong>${fmt(cartTotal())}</strong></div><button class="cart-continue" data-act="close-modal">${e(tr('continue'))}${icon('arrow')}</button>
    </footer>
  </section></div>`;
}

function mizoraReview() {
  const copy=MIZORA_CART_COPY[ui.lang];
  const available=validReviewUrl(reviewLink());
  return `<div class="guest-modal-backdrop mizora-review-backdrop" data-act="close-modal"><section class="mizora-review-card" role="dialog" aria-modal="true" aria-label="${e(copy.reviewTitle)}"><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button>
    ${googleBrandMark()}<p class="review-eyebrow">${e(copy.reviewLabel)}</p><h2>${e(copy.reviewHeading)}</h2><p class="review-copy">${e(copy.reviewCopy)}</p>
    ${available?`<button class="review-open" data-act="open-review">${e(copy.reviewOpen)}${icon('arrow')}</button>`:`<p class="review-availability" role="status">${e(copy.reviewUnavailable)}</p>`}
    <button class="review-back" data-act="guest-information">${icon('back')}${e(INFORMATION_COPY[ui.lang].back)}</button>
  </section></div>`;
}

function guestModal(){if(!ui.modal)return '';if(restaurantProfile && ui.modal==='guest-information')return mizoraInformation();if(restaurantProfile && ui.modal==='filters')return mizoraFilters();if(restaurantProfile && ui.modal==='details' && ui.detailTab==='nutrition')return chosen()?mizoraNutrition(chosen()):'';if(restaurantProfile && ui.modal==='cart')return mizoraCart();if(restaurantProfile && ui.modal==='review')return mizoraReview();if(restaurantProfile && ui.modal==='language')return mizoraLanguage();if(restaurantProfile && ui.modal==='tables')return mizoraTables();
 if(ui.modal==='filters'){
  const matches=listed().length;
  return `<div class="guest-modal-backdrop" data-act="close-modal"><div class="guest-sheet filters-sheet" role="dialog" aria-modal="true" aria-label="${e(tr('filters'))}"><div class="sheet-handle"></div><div class="sheet-head"><div><span class="micro-overline">${e(db.restaurant)} / DISCOVER</span><h2>${e(tr('filters'))}</h2></div><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></div><div class="filter-scroll"><div class="filter-group"><h3>${e(tr('preferences'))}</h3><div class="filter-chip-grid">${DIET_KEYS.map(k=>`<button class="filter-chip ${ui.guestFilters[k]?'chosen':''}" data-act="toggle-diet" data-value="${k}" aria-pressed="${!!ui.guestFilters[k]}">${ui.guestFilters[k]?icon('check'):''}${e(tr(k))}</button>`).join('')}</div></div><div class="filter-group"><h3>${e(tr('spiceLevel'))}</h3><div class="spice-chips">${[[null,'noSpiceLimit'],[0,'mild'],[1,'medium'],[2,'hot']].map(([v,k])=>`<button class="filter-chip ${ui.guestFilters.spice===v?'chosen':''}" data-act="set-spice" data-value="${v===null?'any':v}">${e(tr(k))}</button>`).join('')}</div></div><div class="filter-group"><h3>${e(tr('allergyExclude'))}</h3><div class="filter-chip-grid allergen-filter-grid">${FILTER_ALLERGENS.map(a=>`<button class="filter-chip ${ui.guestFilters.exclude.includes(a)?'chosen':''}" data-act="toggle-allergen" data-value="${e(a)}">${ui.guestFilters.exclude.includes(a)?icon('check'):''}${e(allergenName(a))}</button>`).join('')}</div></div>${calorieFilter()}<p class="filter-warning">${icon('lock')} ${e(tr('demoWarning'))}</p></div><div class="filter-sheet-actions"><button class="filter-reset" data-act="clear-filters">${e(tr('clear'))}</button><button class="primary-btn" data-act="apply-filters">${e(tr('apply'))} · ${matches}</button></div></div></div>`;
 }
 if(ui.modal==='language')return `<div class="guest-modal-backdrop lang-backdrop" data-act="close-modal"><section class="language-card" role="dialog" aria-modal="true" aria-label="${e(tr('switchLanguage'))}"><div class="sheet-head"><div><span class="micro-overline">${e(db.restaurant)}</span><h2>${e(tr('switchLanguage'))}</h2></div><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></div><div class="language-choices">${[['en','English'],['es','Español'],['de','Deutsch']].map(([lang,label])=>`<button class="${ui.lang===lang?'selected':''}" data-act="set-language" data-value="${lang}"><span>${label}</span><b>${lang.toUpperCase()}</b>${ui.lang===lang?icon('check'):''}</button>`).join('')}</div></section></div>`;
 if(ui.modal==='review')return `<div class="guest-modal-backdrop lang-backdrop" data-act="close-modal"><section class="language-card review-card" role="dialog" aria-modal="true" aria-label="${e(tr('reviewTitle'))}"><div class="sheet-head"><div><span class="micro-overline">${e(db.restaurant)}</span><h2>${e(tr('reviewTitle'))}</h2></div><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></div><p>${e(tr('reviewCopy'))}</p>${validReviewUrl(reviewLink())?`<button class="primary-btn full" data-act="open-review">${icon('star')} ${e(tr('reviewAction'))} ${icon('arrow')}</button>`:`<p class="review-demo-note">${e(tr('reviewNotSetup'))}</p>`}<button class="outline-btn full" data-act="close-modal">${e(tr('notNow'))}</button><small>${e(tr('reviewFooter'))}</small></section></div>`;
 if(ui.modal==='cart'){
  const items=Object.entries(currentCart()).filter(([id,q])=>q>0&&dish(id));
  return `<div class="guest-modal-backdrop" data-act="close-modal"><div class="guest-sheet" role="dialog" aria-modal="true" aria-label="${e(tr('selection'))}"><div class="sheet-handle"></div><div class="sheet-head"><div>${restaurantProfile?`<button class="cart-table-link" data-act="tables">${e(tr('changeTable'))} ${pad(ui.table)} ${icon('chevron')}</button>`:`<span class="micro-overline">${e(tr('changeTable'))} ${pad(ui.table)} / DEMO</span>`}<h2>${e(tr('selection'))}</h2></div><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></div><div class="cart-items">${items.length?items.map(([id,q])=>{const d=dish(id);if(!d)return '';return `<div class="cart-item">${dishPhoto(d,'overview')}<div><strong>${e(dishText(d,'name'))}</strong><span>${fmt(d.price)} ${e(tr('each'))}</span><div class="quantity"><button data-act="decrease" data-id="${id}" aria-label="−">${icon('minus')}</button><b>${q}</b><button data-act="add" data-id="${id}" aria-label="+">${icon('plus')}</button></div></div><b>${fmt(q*d.price)}</b></div>`}).join(''):`<p class="empty-cart">${e(tr('emptyCart'))}</p>`}</div><div class="sheet-total"><span>${e(tr('subtotal'))}</span><strong>${fmt(cartTotal())}</strong></div><div class="sheet-disclaimer">${e(tr('cartNotice'))}</div><button class="primary-btn full" data-act="close-modal">${e(tr('continue'))} ${icon('arrow')}</button>${db.reviewEnabled!==false?`<button class="cart-review-entry" data-act="review">${icon('star')} ${e(tr('googleReview'))}</button>`:''}</div></div>`;
 }
 if(ui.modal==='details'){
  const d=chosen();if(!d)return '';
  const allergenNote=d.allergensVerified?tr('verifiedInfo'):tr('allergenNotVerified');
  const nutrition = ui.detailTab === 'nutrition';
  return `<div class="guest-modal-backdrop allergen-backdrop" data-act="close-modal">
    <section class="allergen-card" role="dialog" aria-modal="true" aria-label="${e(tr('details'))}">
      <div class="allergen-card-head"><h2>${e(tr(nutrition ? 'nutrition' : 'allergens'))}</h2><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></div>
      <div class="detail-switch" role="group" aria-label="${e(tr('details'))}">${['allergens','nutrition'].map(tab => `<button data-act="detail-tab" data-value="${tab}" aria-pressed="${tab === ui.detailTab}">${e(tr(tab))}</button>`).join('')}</div>
 ${nutrition ? nutritionPanel(d) : `${d.allergens?.length ? renderAllergenChips(d.allergens,true) : `<p class="allergen-empty">${e(tr('noAllergens'))}</p>`}<p class="allergen-card-note">${e(allergenNote)}</p>`}
    </section></div>`;
 }
 if(ui.modal==='tables')return `<div class="guest-modal-backdrop" data-act="close-modal"><div class="guest-sheet ${restaurantProfile?'mizora-table-sheet':''}" role="dialog" aria-modal="true" aria-label="${e(tr('changeTableTitle'))}"><div class="sheet-handle"></div><div class="sheet-head"><div><span class="micro-overline">${e(db.restaurant)}${restaurantProfile?'':' / DEMO'}</span><h2>${e(tr('changeTableTitle'))}</h2></div><button class="icon-close" data-act="close-modal" aria-label="${e(tr('dismiss'))}">${icon('close')}</button></div><div class="table-pick-grid">${db.tables.map(t=>`<button class="${t.number===ui.table?'active':''}" data-act="set-table" data-value="${t.number}" ${t.active ? '' : 'disabled'}>${e(tr('changeTable'))} ${pad(t.number)}</button>`).join('')}</div>${restaurantProfile?'':`<p class="sheet-disclaimer">${e(tr('tableNote'))}</p>`}</div></div>`;
 return '';
}
function guestThemeAttributes(theme) {
  const {accent,surface,button} = normalizeTheme(theme);
  if (accent === defaultTheme.accent && surface === defaultTheme.surface && button === defaultTheme.button) return '';
  return `data-guest-theme="${button}" style="--guest-accent:${accent};--guest-surface:${surface};--guest-accent-ink:${readableInk(accent)};--guest-surface-ink:${readableInk(surface)}"`;
}
function guest(){return `<main class="guest-stage" lang="${ui.lang}"><div class="device-frame"><div class="phone-screen ${ui.mode}" ${guestThemeAttributes(db.theme)}>${ui.mode==='explore'?heroExplore():''}${headerGuest()}${ui.mode==='overview'?guestOverview():''}${guestCartBar()}${guestModal()}${ui.toast?`<div class="floating-toast">${e(ui.toast)}</div>`:''}</div></div></main>`}

const ownerNav = [
  ['menu','Menu editing','layers','Menu'],
  ['media','Media requests','image','Media'], ['events','Events','calendar','Events'], ['qr','QR & tables','qr','Tables'],
  ['analytics','Analytics','chart','Insights'], ['settings','Settings','settings','Settings'],
];

function ownerNavigation(mobile = false) {
  return `<nav class="${mobile ? 'owner-mobile-bar' : 'owner-nav'}" aria-label="Owner navigation">${ownerNav.map(([id,label,ic,short]) =>
    `<button class="${ui.ownerTab === id ? 'active' : ''}" aria-current="${ui.ownerTab === id ? 'page' : 'false'}" data-act="owner-tab" data-value="${id}" aria-label="${label}">${icon(ic)}<span>${mobile ? short : label}</span></button>`).join('')}</nav>`;
}

function ownerSide() {
  return `<aside class="owner-sidebar"><div class="owner-logo"><span>Foodie<i aria-hidden="true">.</i><small>by Atticoo</small></span></div>
    ${ownerNavigation()}
    <div class="sidebar-bottom"><div class="restaurant-tile">${restaurantProfile?'<img src="assets/mizora/logo-transparent.png" alt="MIZORA">':`<b>${e(db.restaurant)}</b>`}<small>${e(db.tagline)}</small></div>${ownerGuestPreview('Guest menu','sidebar-preview')}</div>
  </aside>`;
}

function ownerGuestPreview(label='Preview menu',className='secondary-btn') {
  const content=icon('eye')+' '+e(label);
  return embedMode==='owner'
    ? `<a class="${className}" href="?restaurant=${restaurantId}&embed=guest&table=${ui.table===null?'':pad(ui.table)}" target="_blank" rel="noopener noreferrer">${content}</a>`
    : `<button class="${className}" data-act="surface" data-value="guest">${content}</button>`;
}

function ownerToolbar(name, description, actions = '') {
  return `<header class="owner-page-head"><div><p class="owner-breadcrumb">${e(db.restaurant)} <span>/ Owner Control</span></p><h1>${name}</h1><p>${description}</p></div><div class="head-buttons"><span class="owner-workspace-status"><i></i>Local workspace</span>${actions}${ownerGuestPreview()}</div></header>`;
}

function ownerDishTiles(dishes) {
  return `<div class="menu-table-wrap"><table class="owner-menu-table"><thead><tr><th>Dish</th><th>Category</th><th>Price</th><th>Status</th><th><span class="sr-only">Edit</span></th></tr></thead><tbody>${dishes.map(d=>`<tr><td><button class="dish-row-name" data-act="edit" data-id="${e(d.id)}">${dishPhoto(d,'overview',{lazy:true})}<span><strong>${e(d.name)}</strong><small>${e(d.summary)}</small></span></button></td><td class="dish-row-category"><select class="row-category" data-dish-category="${e(d.id)}" aria-label="Category · ${e(d.name)}">${CATS.slice(1).map(c=>`<option value="${c.id}" ${c.id===d.category?'selected':''}>${e(c.name)}</option>`).join('')}</select></td><td class="dish-row-price"><label><span aria-hidden="true">${restaurantProfile?.currency==='USD'?'$':'€'}</span><input type="number" min="0" max="999" step=".01" required value="${d.price}" data-dish-price="${e(d.id)}" aria-label="Price · ${e(d.name)}"></label></td><td><button class="availability-switch" type="button" role="switch" aria-checked="${d.live}" aria-label="Available · ${e(d.name)}" data-act="toggle-dish" data-id="${e(d.id)}"><span></span></button></td><td><button class="row-edit" data-act="edit" data-id="${e(d.id)}" aria-label="Edit ${e(d.name)}">${icon('pencil')}</button></td></tr>`).join('')}</tbody></table></div>`;
}

function guestPreview(profile) {
  const d = allLive().find(item => item.id === (restaurantProfile ? 'mizora-03' : 'roasted-salmon')) || allLive()[0];
  if (!d) return '<p class="owner-empty">Publish a dish to preview its appearance here.</p>';
  return `<div class="preview-phone" ${guestThemeAttributes(profile.theme)}>
    <div class="preview-photo">${dishPhoto(d,'explore',{position:EXPLORE_FOCUS[d.id] || 'center'})}
      <div class="preview-brand"><strong data-preview-name>${e(profile.restaurant)}</strong><small data-preview-tagline>${e(profile.tagline)}</small></div>
      <div class="preview-dish"><strong>${e(d.name)}</strong><b>${fmt(d.price)}</b></div>
    </div><div class="preview-actions"><span class="preview-selected">Explore</span><span>Overview</span></div>
  </div>`;
}

function ownerMetric(label,value,symbol){return `<div class="owner-metric">${icon(symbol)}<span>${e(label)}</span><b>${value}</b></div>`;}
function categorySymbol(id){return icon(({all:'grid',raw:'fish',tapas:'spark',salads:'leaf',signatures:'star',water:'drop',earth:'leaf',vegetables:'leaf',desserts:'cake'})[id]||'grid');}
function ownerMenu() {
  const filtered=db.dishes.filter(d=>(ui.filter==='all'||d.category===ui.filter)&&(!ui.search||`${d.name} ${d.summary}`.toLowerCase().includes(ui.search.toLowerCase())));
  const published=db.dishes.filter(d=>d.live).length;
  return `${ownerToolbar('Menu Editing','Manage your menu, categories and dish details.',`<button class="primary-btn" data-act="new-dish">${icon('plus')} Add dish</button>`)}
    <div class="menu-summary" aria-label="Menu summary">${ownerMetric('Menu items',db.dishes.length,'dish')}${ownerMetric('Published',published,'check')}${ownerMetric('Drafts',db.dishes.length-published,'pencil')}${ownerMetric('Categories',CATS.length-1,'layers')}</div>
    <div class="menu-layout"><aside class="menu-structure"><div class="panel-top"><h2>Menu structure</h2></div><nav class="owner-filter-tabs" aria-label="Menu category">${CATS.map(c=>`<button class="${ui.filter===c.id?'active':''}" aria-pressed="${ui.filter===c.id}" data-act="filter" data-value="${c.id}">${categorySymbol(c.id)}<span>${c.id==='all'?'All dishes':e(c.name)}</span><small>${c.id==='all'?db.dishes.length:db.dishes.filter(d=>d.category===c.id).length}</small></button>`).join('')}</nav></aside>
    <section class="menu-main"><div class="panel-top"><h2>Dishes & drinks <span>(${filtered.length})</span></h2><div class="search-wrap">${icon('search')}<input id="owner-search" type="search" placeholder="Search dishes…" value="${e(ui.search)}" aria-label="Search dishes"></div></div>${filtered.length?ownerDishTiles(filtered):'<p class="owner-empty">No dishes match this search.</p>'}</section></div>`;
}

function appearanceDraft() {
  return ui.appearanceDraft ??= {restaurant:db.restaurant,tagline:db.tagline,theme:normalizeTheme(db.theme)};
}

const appearanceSwatches = {
  accent: [['Bronze','#d6a46f'],['Sage','#53694e'],['Blue','#426479'],['Berry','#78546c']],
  surface: [['Cream','#fcf2e3'],['Olive mist','#f0f2e7'],['Sea mist','#edf4f7'],['Porcelain','#fffafa']],
};

function appearance() {
  const draft = appearanceDraft();
  return `${ownerToolbar('Guest appearance','Set the visual style of your restaurant’s guest menu.')}
    <div class="appearance-layout"><form id="appearance-form" class="panel appearance-form">
      <fieldset><legend>Theme presets</legend><div class="preset-grid">${themePresets.map(({name,theme},index) =>
        `<button type="button" class="preset" data-act="theme-preset" data-value="${index}" aria-pressed="${theme.accent === draft.theme.accent && theme.surface === draft.theme.surface && theme.button === draft.theme.button}">
          <span class="preset-colors" style="--preset-accent:${theme.accent};--preset-surface:${theme.surface}"></span><span>${name}</span></button>`).join('')}</div></fieldset>
      ${Object.entries(appearanceSwatches).map(([key,choices]) => `<fieldset><legend>${key === 'accent' ? 'Accent colour' : 'Surface colour'}</legend>
        <div class="swatches">${choices.map(([label,value]) => `<button type="button" class="swatch" style="--swatch:${value};--swatch-ink:${readableInk(value)}" data-act="theme-swatch" data-id="${key}" data-value="${value}" aria-label="${label}" title="${label}" aria-pressed="${draft.theme[key] === value}">${draft.theme[key] === value ? icon('check') : ''}</button>`).join('')}
          <label class="custom-color"><input type="color" name="${key}" value="${draft.theme[key]}" aria-label="Custom ${key} colour"><span>Custom</span></label>
        </div></fieldset>`).join('')}
      <fieldset><legend>Button style</legend><div class="button-options">${[['pill','Pill'],['rounded','Rounded'],['outline','Outline']].map(([key,label]) =>
        `<button type="button" data-act="theme-button" data-value="${key}" aria-pressed="${draft.theme.button === key}">${label}</button>`).join('')}</div></fieldset>
      <div class="profile-fields"><label class="form-field">Restaurant name<input name="restaurant" maxlength="55" required value="${e(draft.restaurant)}"></label>
        <label class="form-field">Tagline<input name="tagline" maxlength="55" value="${e(draft.tagline)}"></label></div>
      <div class="appearance-actions"><button class="primary-btn" type="submit">${icon('check')} Save appearance</button><button type="button" class="secondary-btn" data-act="theme-reset">Restore defaults</button></div>
      <p class="form-status" role="status">${e(ui.appearanceStatus)}</p>
    </form><aside class="panel appearance-preview"><h2>Live preview</h2><div id="appearance-preview">${guestPreview(draft)}</div></aside></div>`;
}

const mediaLabels = {ready:'Ready',requested:'Update requested',production:'In production',approved:'Approved'};
const mediaActions = {ready:'Request an update',requested:'Simulate start of production',production:'Simulate approval',approved:'Request another update'};

const mediaChangeOptions=[['lighting','Lighting','Improve light, contrast and depth','sun'],['crop','Crop & framing','Refine composition and focus','crop'],['background','Background & styling','Adjust the surface or table setting','image'],['presentation','Garnish & presentation','Keep the served dish and ingredients accurate','leaf'],['color','Color grading','Balance colors and the overall look','settings'],['retouching','Retouching','Remove distractions and minor imperfections','spark'],['motion','Motion / video','Request a professionally produced clip','video']];
function mediaRequests() {
  const current=dish(ui.mediaDish)||dish(restaurantProfile?'mizora-03':'roasted-salmon')||db.dishes[0];
  const log=db.mediaRequestLog||[];
  const mode=ui.mediaFilter||'all';
  const requests=log.filter(r=>mode==='all'||(mode==='open'?r.status==='requested':mode==='production'?r.status==='production':r.status==='approved'));
  const draft=ui.mediaDraft||{requestedChanges:[],note:'',priority:'normal'};
  return `${ownerToolbar('Media requests','Request professional edits, new photos or motion clips — managed by the Atticoo media team.')}
    <div class="owner-section-tools"><nav class="status-tabs" aria-label="Media request status">${[['all','Overview',log.length],['open','Open requests',log.filter(r=>r.status==='requested').length],['production','In production',log.filter(r=>r.status==='production').length],['approved','Completed',log.filter(r=>r.status==='approved').length]].map(([key,label,count])=>`<button data-act="media-filter" data-value="${key}" aria-pressed="${mode===key}">${icon(key==='all'?'layers':key==='approved'?'check':'clock')}${label}<small>${count}</small></button>`).join('')}</nav><button class="primary-btn" data-act="new-media-request">${icon('plus')} New media request</button></div>
    ${current?`<div class="media-layout"><section class="panel media-detail"><div class="media-image-wrap">${dishPhoto(current,'overview',{className:'media-cover',alt:current.name})}<span class="image-caption">${icon('image')} Current image</span><label class="media-dish-picker"><span class="sr-only">Choose a dish</span><select id="media-dish-select" aria-label="Dish photograph">${db.dishes.map(d=>`<option value="${e(d.id)}" ${d.id===current.id?'selected':''}>${e(d.name)}</option>`).join('')}</select></label></div><div class="media-copy"><div class="panel-top"><h2>${e(current.name)}</h2><span class="media-state" role="status">${mediaLabels[mediaStatus(db.mediaRequests[current.id])]}</span></div><p>${e(CATS.find(c=>c.id===current.category)?.name||'')} · ${fmt(current.price)}</p><p>${e(current.summary)}</p><div class="media-thumbnails" aria-label="Other dishes">${db.dishes.slice(0,4).map(d=>`<button data-act="media-dish" data-id="${e(d.id)}" aria-pressed="${d.id===current.id}" aria-label="Select ${e(d.name)}">${dishPhoto(d,'overview')}<span>${e(d.name)}</span></button>`).join('')}</div></div></section>
    <form class="panel media-request-form" id="media-request-form" data-dish="${e(current.id)}"><div class="request-form-heading">${icon('spark')}<div><h2>Request media update</h2><p>Select what should be improved for this dish.</p></div></div><fieldset class="media-change-options"><legend class="sr-only">Requested changes</legend>${mediaChangeOptions.map(([key,title,copy,symbol])=>`<label>${icon(symbol)}<span><b>${title}</b><small>${copy}</small></span><input name="change" type="checkbox" value="${key}" ${draft.requestedChanges.includes(key)?'checked':''}></label>`).join('')}</fieldset><div class="request-priority"><label for="request-priority">Priority</label><select id="request-priority" name="priority"><option value="normal">Normal</option><option value="high" ${draft.priority==='high'?'selected':''}>High</option></select></div><label class="form-field">Notes for the media team (optional)<textarea name="note" maxlength="600" rows="3" placeholder="Describe the change. Keep the actual dish and ingredients accurate.">${e(draft.note)}</textarea></label><p class="form-error" role="alert" id="media-request-error" ${ui.mediaError?'':'hidden'}>${e(ui.mediaError||'')}</p><div class="media-submit"><button class="primary-btn copper-btn" type="submit">${icon('send')} Request an Update</button><p>Saved in this browser only.<br>No request is sent to Atticoo.</p></div></form></div>
    <section class="panel request-history"><div class="panel-top"><h2>Local request history</h2><span class="data-tag">${requests.length} requests</span></div>${requests.length?requests.map(r=>`<article class="media-request-row"><div><b>${e(dish(r.dishId)?.name||'Removed dish')}</b><small>${e(r.requestedChanges.map(c=>mediaChangeOptions.find(o=>o[0]===c)?.[1]||c).join(' · '))} · ${e(new Date(r.createdAt).toLocaleDateString('en-GB'))}</small>${r.note?`<p>${e(r.note)}</p>`:''}</div><span class="data-tag">${mediaLabels[r.status]}</span>${r.status!=='approved'?`<button class="secondary-btn" data-act="media-progress" data-id="${e(r.id)}">${r.status==='requested'?'Simulate production':'Simulate approval'}</button>`:''}</article>`).join(''):'<p class="owner-empty">No saved requests in this view. Select a dish and describe the update you need.</p>'}</section>`:'<p class="owner-empty">Add a menu item to start a media request.</p>'}`;
}

function tableQrAsset(number) {
  return restaurantProfile ? 'assets/qr-mizora/table-'+pad(number)+'.svg' : 'assets/qr/table-'+pad(number)+'.png';
}
async function downloadQr(number) {
  try {
    const image=new Image();image.src=tableQrAsset(number);await image.decode();
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
    const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,1024,1024);context.drawImage(image,0,0,1024,1024);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG unavailable');
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=restaurantId+'_Table_'+pad(number)+'_DEMO.png';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  } catch {renderToastOnly('Unable to download this QR image');}
}
function qrPage() {
  const active=db.tables.filter(t=>t.active).length,filter=ui.qrFilter||'all';
  const tables=db.tables.filter(t=>(filter==='all'||(filter==='active'?t.active:!t.active))&&(!ui.qrSearch||('table '+pad(t.number)).includes(ui.qrSearch.toLowerCase())));
  return `${ownerToolbar('Table QR codes','Unique table codes for a considered guest menu experience.',`<button class="primary-btn" data-act="new-table" ${db.tables.length>=24?'disabled':''}>${icon('plus')} Add table</button>`)}
    <div class="qr-intro panel"><div class="qr-intro-title">${icon('qr')}<div><h2>${db.tables.length} tables · ${e(db.restaurant)}</h2><p>Local previews · QR destinations are placeholders, not live restaurant links.</p></div></div><div class="qr-summary">${ownerMetric('Total tables',db.tables.length,'layers')}${ownerMetric('Active',active,'check')}${ownerMetric('Paused',db.tables.length-active,'pause')}</div></div>
    <div class="owner-section-tools qr-tools"><nav class="status-tabs" aria-label="Table status">${[['all','All tables',db.tables.length],['active','Active',active],['paused','Paused',db.tables.length-active]].map(([key,label,count])=>`<button data-act="qr-filter" data-value="${key}" aria-pressed="${filter===key}">${label}<small>${count}</small></button>`).join('')}</nav><div class="qr-search-tools"><div class="search-wrap">${icon('search')}<input id="table-search" type="search" placeholder="Search tables…" aria-label="Search tables" value="${e(ui.qrSearch||'')}"></div><div class="layout-switch" aria-label="Table layout"><button data-act="qr-layout" data-value="grid" aria-pressed="${ui.qrLayout!=='list'}" aria-label="Table grid">${icon('grid')}</button><button data-act="qr-layout" data-value="list" aria-pressed="${ui.qrLayout==='list'}" aria-label="Table list">${icon('menu')}</button></div></div></div>
    <div class="qr-grid ${ui.qrLayout==='list'?'qr-list-layout':''}">${tables.map(t=>{const cart=db.carts[pad(t.number)]||{},count=Object.values(cart).reduce((sum,quantity)=>sum+quantity,0);return `<article class="table-qr panel"><div class="table-qr-head"><span class="table-number">Table ${pad(t.number)}</span><span class="status-pill ${t.active?'':'paused'}"><i></i>${t.active?'Active':'Paused'}</span></div><img class="qr-image" src="${tableQrAsset(t.number)}" alt="${e(db.restaurant)} · Table ${pad(t.number)} · placeholder QR"><div class="qr-stats"><span>${icon('layers')}<span>Local items <b>${count}</b></span></span><span>${icon('table')}<span>Subtotal <b>${fmt(cartAmount(cart))}</b></span></span></div><div class="qr-actions"><button class="tiny-action" data-act="test-table" data-value="${t.number}" ${t.active?'':'disabled'}>${icon('eye')} Preview</button><button class="tiny-action" data-act="download-qr" data-value="${t.number}" aria-label="Download table ${pad(t.number)} QR as PNG">${icon('download')} PNG</button><a class="tiny-action" href="${tableQrAsset(t.number)}" download="${restaurantId}_Table_${pad(t.number)}_DEMO.${restaurantProfile?'svg':'png'}" aria-label="Download original table QR">${icon('download')} ${restaurantProfile?'SVG':'File'}</a><button class="tiny-action" data-act="copy-qr" data-value="${t.number}" aria-label="Copy placeholder destination">${icon('copy')} Copy</button><button class="qr-pause" data-act="toggle-table" data-value="${t.number}">${icon('pause')} ${t.active?'Pause table':'Activate table'}</button></div></article>`;}).join('')}</div>${!tables.length?'<p class="owner-empty">No tables match your selection.</p>':''}`;
}
const sampleDays = [130,160,154,190,214,180,250,235,280,305,290,342,370,401];
const sampleDishViews = {'roasted-salmon':642,'margherita-pizza':521,'aurel-steak':416,'yuzu-spritz':328,'espresso-martini':296,'lychee-highball':284};


function rankList(title,items) {
 const all=items.map(d=>({d,count:db.events.dishViews[d.id]||0})).filter(x=>x.count).sort((a,b)=>b.count-a.count);
 const total=all.reduce((sum,x)=>sum+x.count,0);
 return `<section class="panel popular-panel"><div class="panel-top"><div><h2>${title}</h2><p>Recorded dish interactions in this browser.</p></div><span class="data-tag">Local views</span></div>${all.slice(0,5).map(({d,count})=>`<div class="rank-item">${dishPhoto(d,'overview')}<div class="rank-copy"><b>${e(d.name)}</b><small>${e(d.summary)}</small></div><div class="rank-count"><span>${count} interactions <b>${Math.round(count/total*100)}%</b></span><span class="rank-track" role="img" aria-label="${Math.round(count/total*100)} percent of recorded dish interactions"><i style="width:${count/total*100}%"></i></span></div></div>`).join('')||'<div class="analytics-empty">'+icon('chart')+'<p>No dish interactions yet.</p><small>Activity appears as guests explore the local menu.</small></div>'}</section>`;
}
function trafficDataset() {
 const sample=ui.analyticsMode==='sample';
 const days=Array.from({length:14},(_,index)=>{const date=new Date();date.setDate(date.getDate()-13+index);return [date.getFullYear(),pad(date.getMonth()+1),pad(date.getDate())].join('-');});
 const values=sample?sampleDays:days.map(day=>Number(db.events.byDay?.[day])||0);
 const previous=values.slice(0,7).reduce((a,b)=>a+b,0),current=values.slice(7).reduce((a,b)=>a+b,0);
 return {restaurantId,source:sample?'illustrative sample':'local browser activity',metric:'menu opens',daily:days.map((date,index)=>({date,value:values[index]})),total:values.reduce((a,b)=>a+b,0),previousWeek:previous,currentWeek:current,changePercent:previous?(current/previous-1)*100:null};
}

function trafficChart() {
 const data=trafficDataset(),sample=ui.analyticsMode==='sample';
 const values=data.daily.map(d=>d.value),maximum=Math.max(4,...values),step=10**Math.floor(Math.log10(maximum)),max=Math.ceil(maximum/step)*step;
 const points=values.map((value,index)=>[48+index*566/13,170-value/max*144]);
 const line=points.map(([x,y],index)=>(index?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' ');
 const delta=data.changePercent===null?'No previous-week comparison':new Intl.NumberFormat('en',{style:'percent',maximumFractionDigits:1,signDisplay:'always'}).format(data.changePercent/100)+' over previous 7 days';
 return `<section class="panel traffic-panel"><div class="panel-top"><div><h2>Menu traffic</h2><p>${sample?'Illustrative data · 14 days':'Recorded menu opens · last 14 days'}</p></div><div class="analytics-view-switch" aria-label="Traffic data source">${[['local','Local'],['sample','Example']].map(([key,label])=>`<button data-act="analytics-view" data-value="${key}" aria-pressed="${(sample?'sample':'local')===key}">${label}</button>`).join('')}</div></div><div class="traffic-summary"><strong>${new Intl.NumberFormat('en').format(data.total)}</strong><span>${sample?'example menu opens · illustrative':'local menu opens'}</span><small class="sample-delta">${e(delta)}</small></div>
 <svg class="traffic-chart" viewBox="0 0 640 205" preserveAspectRatio="none" role="group" aria-label="${sample?'Illustrative':'Local'} menu opens by day"><defs><linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ef9861" stop-opacity=".3"/><stop offset="100%" stop-color="#ef9861" stop-opacity="0"/></linearGradient></defs>${[0,1,2,3,4].map(t=>`<path d="M48 ${170-t*36}H614" stroke="#dfb78d28" stroke-dasharray="4 6"/><text x="37" y="${174-t*36}" text-anchor="end" class="chart-axis">${new Intl.NumberFormat('en',{maximumFractionDigits:0}).format(max*t/4)}</text>`).join('')}<path d="${line}L614 170H48Z" fill="url(#traffic-fill)"/><path d="${line}" fill="none" stroke="#ef9861" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.map(([x,y],index)=>`<g class="chart-point" tabindex="0" role="img" aria-label="${e(data.daily[index].date)}: ${values[index]} menu opens"><line class="chart-cross" x1="${x}" y1="24" x2="${x}" y2="170"/><circle cx="${x}" cy="${y}" r="8" fill="transparent"/><circle class="chart-dot" cx="${x}" cy="${y}" r="3"/><g class="chart-callout" transform="translate(${Math.min(518,Math.max(48,x-44))},${Math.max(5,y-55)})"><rect width="98" height="44" rx="8"/><text x="10" y="17">${sample?'Day '+(index+1):data.daily[index].date.slice(5)}</text><text x="10" y="33">${values[index]} opens</text></g></g>`).join('')}${[0,6,13].map(index=>`<text x="${48+index*566/13}" y="198" text-anchor="${index===0?'start':index===13?'end':'middle'}" class="chart-axis">${sample?'Day '+(index+1):data.daily[index].date.slice(5)}</text>`).join('')}</svg></section>`;
}

function languageAnalytics() {
  const counts=GUEST_LANGUAGES.map(language=>({...language,count:Number(db.events.byLanguage?.[language.id])||0}));
  const total=counts.reduce((sum,item)=>sum+item.count,0);
  return `<section class="panel language-analytics"><div class="panel-top"><h2>Languages</h2><span class="data-tag">Local</span></div><p class="analytics-subtitle">Menu opens and language choices</p>${counts.map(({id,name,count})=>{
    const percent=total?count/total*100:0;
    return `<div class="language-stat"><div>${languageFlag(id)}<span>${name}</span><b>${total?Math.round(percent)+'%':'—'}</b></div><span class="language-track"><i style="width:${percent}%"></i></span><small>${count} ${count===1?'interaction':'interactions'}</small></div>`;
  }).join('')}<p class="analytics-footnote">${total?total+' recorded interactions. Not unique guests.':'New menu opens and language selections will appear here.'}</p></section>`;
}

function analytics() {
  const rate = viewCartRate(db.events.measuredViews,db.events.viewsWithAdd);
  const cartValue = Object.values(db.carts).reduce((sum,cart) => sum + Math.round(cartAmount(cart)*100),0) / 100;
  const metrics = [
    ['Menu views',db.events.views,'eye'], ['Dish interactions',db.events.opens,'spark'], ['Cart additions',db.events.adds,'cart'],
    ['Add-to-cart rate',rate === null ? '—' : new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(rate) + '%','percent'],
    ['Estimated cart value',fmt(cartValue),'layers'],
  ];
  return `${ownerToolbar('Analytics','A clear view of how guests explore your menu.',`<button class="secondary-btn" data-act="analytics-export">${icon('download')} Export data</button>`)}
    <section aria-label="Local activity"><div class="section-heading"><h2>Local activity</h2><span>This browser only</span></div>
      <div class="analytics-metrics">${metrics.map(([label,value,symbol]) => ownerMetric(label,value,symbol)).join('')}</div>
      <p class="analytics-footnote">${db.events.viewsWithAdd} of ${db.events.measuredViews} measured menu opens included a cart addition. Cart value reflects local selections, not orders or revenue.</p>
    </section>
    <div class="analytics-grid">${trafficChart()}${languageAnalytics()}
      ${rankList('Popular dishes',db.dishes.filter(d => d.category !== 'drinks'))}
      <section class="panel"><div class="panel-top"><h2>Table activity</h2><span class="data-tag">${db.events.qrPreviews} QR previews</span></div><div class="table-activity">${db.tables.map(t => `<div class="${db.events.byTable[pad(t.number)]?'has-activity':''}"><span>Table ${pad(t.number)}</span><b>${db.events.byTable[pad(t.number)] || 0}</b><small>${t.active?'Active':'Paused'}</small></div>`).join('')}</div><p class="analytics-footnote">Local menu opens and interactions attributed to each table.</p></section>
      ${db.dishes.some(d=>d.category==='drinks')?rankList('Popular drinks',db.dishes.filter(d=>d.category==='drinks')):''}
    </div>`;
}
function settings(){return `${ownerToolbar('Settings','Manage reviews, guest languages, local data and restaurant preferences.')}<div class="settings-layout">
 <section class="panel feedback-settings"><div class="settings-card-heading">${icon('star')}<div><h2>Guest feedback & review links</h2><p>Optional ways for guests to connect with your restaurant.</p></div></div><form id="profile-form"><label class="form-field">Instagram profile<input name="instagramUrl" type="url" placeholder="https://www.instagram.com/…/" value="${e(db.instagramUrl||'')}"></label><label class="form-field">Google review link<input name="reviewUrl" type="url" placeholder="Paste your official Google review URL" value="${e(db.reviewUrl||'')}" aria-describedby="review-link-hint"></label><label class="review-enabled"><input type="checkbox" name="reviewEnabled" ${db.reviewEnabled!==false?'checked':''}> Show review link in guest menu</label><p class="settings-hint" id="review-link-hint">HTTPS Google links only. Reviews are voluntary, with no incentives, ratings gate or automatic pop-up.</p><button class="primary-btn" type="submit">${icon('check')} Save feedback settings</button></form></section>
 <section class="panel language-settings"><div class="settings-card-heading">${icon('globe')}<div><h2>Guest languages</h2><p>Three languages, included in your guest menu.</p></div></div><div class="language-summary" aria-label="Included guest languages">${GUEST_LANGUAGES.map(l=>`<span>${languageFlag(l.id)}${l.id.toUpperCase()}</span>`).join('')}</div><p class="helper-copy">English, Deutsch and Español are bundled offline. The guest language button changes the interface, categories and available menu descriptions.</p><div class="translation-entry"><div>${icon('globe')}<span><b>Dish translations in Menu Editing</b><small>Edit names and descriptions for each language.</small></span></div><button class="secondary-btn" data-act="owner-translations">${icon('pencil')} Open translations</button></div></section>
 <section class="panel data-settings"><div class="settings-card-heading">${icon('layers')}<div><h2>Local workspace data</h2><p>Your browser workspace for ${e(db.restaurant)}.</p></div></div><div class="settings-action-row">${icon('layers')}<span><b>Selected restaurant</b><small>${e(db.restaurant)} · ${db.dishes.length} dishes · ${db.tables.length} tables</small></span><span class="data-tag">Browser only</span></div><div class="settings-action-row">${icon('clock')}<span><b>Reset to sample menu</b><small>Restore this restaurant’s original prototype content.</small></span><button class="secondary-btn" data-act="reset">Reset demo</button></div><div class="settings-action-row">${icon('download')}<span><b>Export local data</b><small>Download menu, tables, events, requests and settings.</small></span><button class="secondary-btn" data-act="export">${icon('download')} Export</button></div><p class="workspace-note">Changes affect this browser only. No live orders or shared restaurant data are connected.</p></section>
 <section class="panel preferences-settings"><div class="settings-card-heading">${icon('settings')}<div><h2>Restaurant preferences</h2><p>The current configuration of your guest experience.</p></div></div><dl class="preferences-list"><div><dt>${icon('dish')} Menu profile</dt><dd>${e(db.restaurant)}</dd></div><div><dt>${icon('image')} Photography</dt><dd>9:16 Explore · 4:3 Overview</dd></div><div><dt>${icon('qr')} QR destinations</dt><dd>Demo placeholders</dd></div><div><dt>${icon('leaf')} Dietary information</dt><dd>${db.dishes.every(d=>d.dietaryVerified)?'Restaurant checked':'Confirmation required'}</dd></div></dl><p class="settings-hint">Dietary and allergen estimates require restaurant confirmation. Cross-contact cannot be checked here.</p>${ownerGuestPreview('Open guest menu')}</section></div>`;}

function nutritionEditor(d) {
  const values = d.nutrition;
  return `<fieldset class="nutrition-editor" aria-describedby="nutrition-editor-hint">
    <legend>Estimated nutrition <small>Optional</small></legend>
    <p id="nutrition-editor-hint">Enter approximate values for the listed serving or menu portion. Leave unknown values blank.</p>
    <div class="nutrition-editor-grid">${nutritionFields.map(({key,label,unit,max,step}) =>
      `<label class="form-field">${label} (${unit})<input name="nutrition_${key}" type="number" min="0" max="${max}" step="${step}" value="${e(values?.[key] ?? '')}"></label>`).join('')}</div>
    <div class="nutrition-editor-grid">
      <label class="form-field">Serving size<input name="nutrition_serving" maxlength="48" value="${e(values?.serving || '')}" placeholder="e.g. 250 g"></label>
      <label class="form-field">Estimate source<select name="nutrition_source"><option value="entered">Restaurant-entered estimate</option><option value="sample" ${values?.source === 'sample' ? 'selected' : ''}>Fictional sample estimate</option></select></label>
    </div><p class="form-error" id="nutrition-error" role="alert" hidden>Check the highlighted value and its unit.</p></fieldset>`;
}

function readNutritionForm(form, data) {
  const fields = [...nutritionFields.map(item => item.key),'serving','source'];
  try {
    return parseNutrition(Object.fromEntries(fields.map(key => [key,String(data.get('nutrition_'+key) || '')])));
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    const input = form.elements.namedItem('nutrition_' + error.message);
    input.setAttribute('aria-invalid','true');
    input.setAttribute('aria-describedby','nutrition-error');
    form.querySelector('#nutrition-error').hidden = false;
    input.focus();
    return undefined;
  }
}

function saveAppearance(form) {
  const draft = appearanceDraft();
  const name = draft.restaurant.trim();
  if (!name) {
    form.elements.restaurant.setCustomValidity('Enter a restaurant name.');
    form.reportValidity();
    return;
  }
  db.restaurant = draft.restaurant = name;
  db.tagline = draft.tagline = draft.tagline.trim();
  db.theme = normalizeTheme(draft.theme);
  save();
  ui.appearanceStatus = storageEnabled ? 'Appearance saved to this browser.' : 'Appearance applied for this visit. Browser storage is unavailable.';
  render();
}

function updateAppearancePreview(input) {
  const draft = appearanceDraft();
  if (input.name === 'accent' || input.name === 'surface') {
    draft.theme = normalizeTheme({...draft.theme,[input.name]:input.value});
    for (const swatch of input.form.querySelectorAll('[data-act="theme-swatch"]')) {
      const selected = draft.theme[swatch.dataset.id] === swatch.dataset.value;
      swatch.setAttribute('aria-pressed',String(selected));
      swatch.innerHTML = selected ? icon('check') : '';
    }
    input.form.querySelectorAll('[data-act="theme-preset"]').forEach((button,index) => {
      const preset = themePresets[index].theme;
      button.setAttribute('aria-pressed',String(preset.accent === draft.theme.accent && preset.surface === draft.theme.surface && preset.button === draft.theme.button));
    });
  } else {
    input.setCustomValidity('');
    draft[input.name] = input.value;
  }
  ui.appearanceStatus = '';
  input.form.querySelector('.form-status').textContent = '';
  document.getElementById('appearance-preview').innerHTML = guestPreview(draft);
}

function editor(){if(!ui.editor)return '';const d=ui.editor==='new'?{id:'',name:'',category:restaurantProfile?'salads':'starters',price:0,summary:'',components:[],live:false,featured:false,allergens:[],allergensVerified:false}:dish(ui.editor);if(!d)return '';const common=MIZORA_ALLERGENS;return `<div class="editor-backdrop" data-act="close-editor"><aside class="editor-drawer" role="dialog" aria-modal="true" aria-label="Edit dish"><div class="editor-head"><div><span class="micro-overline">Foodie by Atticoo / EDITOR</span><h2>${ui.editor==='new'?'New dish':'Edit dish'}</h2></div><button class="icon-close" data-act="close-editor" aria-label="Close editor">${icon('close')}</button></div><form id="dish-form"><div class="editor-photo">${dishPhoto(d,'overview',{alt:'Current dish photo'})}</div><div class="editor-two"><label class="form-field">Dish name<input name="name" required maxlength="90" value="${e(d.name)}"></label><label class="form-field">Price (${restaurantProfile?.currency === 'USD' ? '$' : '€'})<input name="price" type="number" min="0" max="999" step="0.01" required value="${e(d.price)}"></label></div><label class="form-field">Menu category<select name="category">${CATS.slice(1).map(c=>`<option value="${c.id}" ${c.id===d.category?'selected':''}>${e(c.name)}</option>`).join('')}</select></label><label class="form-field">Short menu description<textarea name="summary" maxlength="210" required rows="2">${e(d.summary)}</textarea></label><label class="form-field">What's on the plate <small>Separate key components with commas</small><textarea name="components" maxlength="250" rows="2">${e((d.components||[]).join(', '))}</textarea></label><div class="editor-switches"><label><input name="live" type="checkbox" ${d.live?'checked':''}> Published in guest menu</label><label><input name="featured" type="checkbox" ${d.featured?'checked':''}> Featured dish</label></div><div class="allergen-editor dietary-editor"><div class="panel-top"><div><h3>Dietary & spice labels</h3><p>Illustrative until independently verified by the restaurant. Check production ingredients and cross-contact.</p></div></div><div class="allergen-grid owner-allergen-options">${DIET_KEYS.map(k=>`<label data-value="${k}"><input name="diet_${k}" type="checkbox" ${seedDietary(d)[k]?'checked':''}>${foodIcon(k)}<span>${e(UI_I18N.en[k])}</span></label>`).join('')}</div><label class="form-field spice-editor">Spice level<select name="spice"><option value="0" ${(restaurantProfile ? d.dietary?.spice : seedDietary(d).spice)===0?'selected':''}>Mild / no heat</option><option value="1" ${seedDietary(d).spice===1?'selected':''}>Medium</option><option value="2" ${seedDietary(d).spice===2?'selected':''}>Hot</option></select></label><label class="allergen-verified"><input name="dietaryVerified" type="checkbox" ${d.dietaryVerified?'checked':''}> I confirm these dietary / halal / spice labels have been checked for this dish</label></div><div class="allergen-editor"><div class="panel-top"><div><h3>Allergen information</h3><p>Select only information the restaurant has verified.</p></div></div><div class="allergen-grid owner-allergen-options">${common.map(a=>`<label data-value="${e(a)}"><input name="allergen" type="checkbox" value="${e(a)}" ${(d.allergens||[]).includes(a)?'checked':''}>${foodIcon(a)}<span>${e(a)}</span></label>`).join('')}</div><label class="allergen-verified"><input name="verified" type="checkbox" ${d.allergensVerified?'checked':''}> I confirm these allergen details have been checked by the restaurant</label></div>${nutritionEditor(d)}<div class="editor-language-group"><h3>Guest translations</h3><p>Editable language variants. If left blank, demo default translations or English will be used.</p>${[['de','Deutsch'],['es','Español']].map(([lang,label])=>`<div class="editor-language-panel"><strong>${label}</strong><label class="form-field">Name<input name="${lang}_name" maxlength="90" value="${e(d.translations?.[lang]?.name||DISH_I18N[d.id]?.[lang]?.name||'')}"></label><label class="form-field">Short description<textarea name="${lang}_summary" maxlength="210" rows="2">${e(d.translations?.[lang]?.summary||DISH_I18N[d.id]?.[lang]?.summary||'')}</textarea></label></div>`).join('')}</div><div class="editor-actions"><button type="button" class="secondary-btn" data-act="close-editor">Cancel</button>${ui.editor!=='new'?`<button type="button" class="text-danger" data-act="delete-dish" data-id="${e(d.id)}">Delete</button>`:''}<button type="submit" class="primary-btn">${icon('check')} Save dish</button></div></form></aside></div>`}
function owner() {
  const sections = {menu:ownerMenu, media:mediaRequests, events:ownerEvents, qr:qrPage, analytics, settings};
  if(!sections[ui.ownerTab])ui.ownerTab='menu';
  return `<div class="owner-shell">${ownerSide()}<main class="owner-main" data-owner-page="${ui.ownerTab}"><div class="owner-mobile-brand"><span>Foodie<i>.</i><small>by Atticoo</small></span>${restaurantProfile?'<img src="assets/mizora/logo-transparent.png" alt="MIZORA">':`<b>${e(db.restaurant)}</b>`}</div>${sections[ui.ownerTab]()}</main>${ownerNavigation(true)}${editor()}</div>`;
}

let dialogTrigger = null;

function describeAction(node) {
  return node?.dataset.act ? {
    act:node.dataset.act, value:node.dataset.value, id:node.dataset.id,
    inSidebar:!!node.closest('.owner-sidebar'), inMobileNav:!!node.closest('.owner-mobile-bar'),
  } : null;
}

function findAction(description, scope = root) {
  if (!description) return null;
  return [...scope.querySelectorAll('[data-act]')].find(node => node.getClientRects().length &&
    node.dataset.act === description.act && node.dataset.value === description.value && node.dataset.id === description.id &&
    !!node.closest('.owner-sidebar') === description.inSidebar &&
    !!node.closest('.owner-mobile-bar') === description.inMobileNav);
}

function render({resetOverview=false}={}) {
  if (ui.surface === 'guest') ensureGuestSelected();
  const previousDialog = root.querySelector('[role="dialog"]');
  const active = describeAction(document.activeElement);
  const overview = root.querySelector('#overview-scroll');
  const categories = root.querySelector('#quick-tabs');
  const filters = root.querySelector('.filter-scroll');
  const mediaScroll = root.querySelector('.media-list')?.scrollTop;
  if (resetOverview) ui.overviewScroll=0;
  else if (overview) ui.overviewScroll = overview.scrollTop;
  if (categories) ui.categoryScroll = categories.scrollLeft;
  if (filters) ui.filterScroll = filters.scrollTop;
  document.body.dataset.surface = ui.surface;
  document.documentElement.lang = ui.surface === 'guest' && embedMode === 'guest' ? ui.lang : 'en';
  root.innerHTML = `<div class="app-wrap">${topbar()}${ui.surface === 'guest' ? guest() : owner()}</div>`;
  const newOverview = root.querySelector('#overview-scroll');
  const newCategories = root.querySelector('#quick-tabs');
  const newFilters = root.querySelector('.filter-scroll');
  const mediaList = root.querySelector('.media-list');
  if (mediaList && mediaScroll !== undefined) mediaList.scrollTop = mediaScroll;
  if (newOverview) newOverview.scrollTop = ui.overviewScroll;
  if (newCategories) newCategories.scrollLeft = ui.categoryScroll;
  if (newFilters) newFilters.scrollTop = ui.filterScroll;
  const dialog = root.querySelector('[role="dialog"]');
  if (dialog) {
    for (let branch = dialog.parentElement; branch && branch !== root; branch = branch.parentElement) {
      const content = [...branch.children].find(child => child.contains(dialog));
      for (const sibling of branch.children) if (sibling !== content) sibling.inert = true;
    }
    dialog.tabIndex = -1;
    (previousDialog && findAction(active,dialog) || dialog.querySelector('.icon-close') || dialog).focus({preventScroll:true});
  } else {
    const following = findAction(previousDialog ? dialogTrigger : active);
    if (previousDialog) dialogTrigger = null;
    following?.focus({preventScroll:true});
  }
}

function renderToastOnly(message) {
  setToast(message);
  const container = root.querySelector('.phone-screen, .owner-shell');
  const existing = container.querySelector('.floating-toast');
  if(existing) existing.textContent=message;
  else container.insertAdjacentHTML('beforeend',`<div class="floating-toast" role="status">${e(message)}</div>`);
}
function flipSurface(name){window.scrollTo({top:0,behavior:'instant'});ui.surface=name;ui.modal=null;ui.editor=null;if(name==='guest')event('views');render()}
function turnDish(dir){const l=listed();if(l.length<2)return;let i=l.findIndex(x=>x.id===ui.selected);ui.selected=l[((i===-1?0:i)+dir+l.length)%l.length].id;event('opens',ui.selected);render();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)root.querySelector('.explore-hero')?.animate([{transform:`translate3d(${dir*14}px,0,0)`,opacity:.94},{transform:'translate3d(0,0,0)',opacity:1}],{duration:200,easing:'cubic-bezier(.2,.7,.3,1)'})}
function showCategory(id){ui.category=id;const first=listed()[0];if(first)ui.selected=first.id;render({resetOverview:true});const t=document.querySelector(`.quick-tab[data-value="${id}"]`);t?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'})}
function downloadJSON(){downloadPayload(db,'Foodie_Atticoo_'+restaurantId+'_LocalDemo.json');}
function downloadPayload(payload,filename){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function copyText(s){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(s);const input=document.createElement('textarea');input.value=s;input.style.position='fixed';input.style.opacity=0;document.body.appendChild(input);input.select();const ok=document.execCommand('copy');input.remove();return Promise.resolve(ok)}

const handleActions=async(act,node)=>{
const val=node.dataset.value, id=node.dataset.id;
if(act==='previous-dish'||act==='next-dish'){if(ui.surface==='guest'&&ui.mode==='explore'&&!ui.modal)turnDish(act==='next-dish'?1:-1);return;}
switch(act){
 case 'surface':flipSurface(val);break;
 case 'guest-back':ui.mode='overview';ui.modal=null;render();break;
 case 'guest-information':db=loadDB();ui.modal='guest-information';render();break;
 case 'new-event':ui.eventEditor=null;ui.eventDraft=null;render();document.querySelector('#event-form input')?.focus();break;
 case 'event-filter':ui.eventFilter=val;render();break;
 case 'qr-filter':ui.qrFilter=val;render();break;
 case 'qr-layout':ui.qrLayout=val==='list'?'list':'grid';render();break;
 case 'edit-event':ui.eventEditor=id;ui.eventDraft=null;render();break;
 case 'toggle-event':{const item=db.restaurantEvents.find(item=>item.id===id);if(item){item.published=!item.published;save();render();}break;}
 case 'delete-event':if(confirm('Delete this event?')){db.restaurantEvents=db.restaurantEvents.filter(item=>item.id!==id);if(ui.eventEditor===id){ui.eventEditor=null;ui.eventDraft=null;}save();render();}break;
 case 'language':ui.modal='language';render();break;
 case 'set-language':ui.lang=['en','de','es'].includes(val)?val:'en';db.guestLang=ui.lang;ui.modal=null;event('language');render();break;

 case 'filters':ui.modal='filters';ui.filterScroll=0;render();break;
 case 'toggle-diet':if(DIET_KEYS.includes(val))ui.guestFilters[val]=!ui.guestFilters[val];ensureGuestSelected();render();break;
 case 'set-spice':ui.guestFilters.spice=val==='any'?null:Math.max(0,Math.min(2,Number(val)));ensureGuestSelected();render();break;
 case 'toggle-allergen':if((restaurantProfile?MIZORA_ALLERGENS:FILTER_ALLERGENS).includes(val)){const a=ui.guestFilters.exclude;ui.guestFilters.exclude=a.includes(val)?a.filter(x=>x!==val):[...a,val]}ensureGuestSelected();render();break;
 case 'clear-filters':ui.guestFilters=emptyFilters();if(restaurantProfile)ui.category='all';ensureGuestSelected();render({resetOverview:true});break;
 case 'apply-filters':ui.modal=null;ensureGuestSelected();render({resetOverview:true});break;
 case 'review':ui.modal='review';render();break;
 case 'open-review':if(validReviewUrl(reviewLink()))window.open(reviewLink(),'_blank','noopener,noreferrer');break;
 case 'category':showCategory(val);break;
 case 'mode':ui.mode=val;ui.modal=null;render();break;
 case 'open':ui.selected=id;ui.mode='explore';event('opens',id);render();break;
 case 'add':addToCart(id,1);break;
 case 'decrease':addToCart(id,-1);break;
 case 'cart':ui.modal='cart';event('cartViews');render();break;
 case 'nutrition':ui.detailTab='nutrition';ui.modal='details';render();break;
 case 'details':ui.detailTab='allergens';ui.modal='details';render();break;
 case 'tables':ui.modal='tables';render();break;
 case 'set-table':
  if (db.tables.some(t => t.active && t.number === Number(val)) && ui.table !== Number(val)) {
    ui.table=Number(val);event('views');
  }
  ui.modal=null;render();break;
 case 'close-modal':ui.modal=null;render();break;

 case 'owner-tab':
  if(!ownerNav.some(([key])=>key===val))break;
  if (ui.ownerTab !== val) window.scrollTo({top:0,behavior:'instant'});
  ui.ownerTab=val;ui.editor=null;render();break;
 case 'set-calorie':
  ui.guestFilters.calorie=CALORIE_LIMITS.includes(Number(val)) ? Number(val) : null;
  ensureGuestSelected();render();break;
 case 'detail-tab':ui.detailTab=val;render();break;
 case 'theme-preset':
  appearanceDraft().theme=normalizeTheme(themePresets[Number(val)].theme);
  ui.appearanceStatus='';render();break;
 case 'theme-swatch':
  appearanceDraft().theme=normalizeTheme({...appearanceDraft().theme,[id]:val});
  ui.appearanceStatus='';render();break;
 case 'theme-button':
  appearanceDraft().theme=normalizeTheme({...appearanceDraft().theme,button:val});
  ui.appearanceStatus='';render();break;
 case 'theme-reset':
  ui.appearanceDraft={restaurant:DEFAULT_DB.restaurant,tagline:DEFAULT_DB.tagline,theme:normalizeTheme(defaultTheme)};
  ui.appearanceStatus='Defaults restored in the preview. Save to apply them.';render();break;
 case 'media-dish':ui.mediaDish=id;ui.mediaDraft=null;ui.mediaError='';render();break;
 case 'media-filter':ui.mediaFilter=val;render();break;
 case 'new-media-request':ui.mediaDraft=null;ui.mediaError='';render();document.getElementById('media-dish-select')?.focus();break;
 case 'media-progress':{const request=db.mediaRequestLog.find(r=>r.id===id);if(request){request.status=nextMediaStatus(request.status);db.mediaRequests[request.dishId]=request.status;save();render();}break;}
 case 'media-advance':
  if (dish(id)) {
    db.mediaRequests[id]=nextMediaStatus(mediaStatus(db.mediaRequests[id]));
    save();render();
  }
  break;
 case 'analytics-view':ui.analyticsMode=val==='local'?'local':'sample';render();break;
 case 'toggle-dish':{const item=dish(id);if(item){item.live=!item.live;save();render();}break;}
 case 'download-qr':downloadQr(val);break;
 case 'filter':ui.filter=val;ui.search='';render();break;
 case 'edit':ui.editor=id;render();break;
 case 'new-dish':ui.editor='new';render();break;
 case 'close-editor':ui.editor=null;render();break;
 case 'delete-dish':if(confirm('Delete this dish from the local demo?')){delete db.mediaRequests[id];delete db.events.dishViews[id];db.dishes=db.dishes.filter(x=>x.id!==id);Object.values(db.carts).forEach(c=>delete c[id]);if(ui.selected===id)ui.selected=db.dishes[0]?.id;ui.editor=null;save();render()}break;






 case 'new-table':{const next=Math.max(...db.tables.map(t=>t.number),0)+1;if(next>24){alert('The offline demo contains QR assets for up to 24 tables.');break;}db.tables.push({number:next,active:true});save();render();break}
 case 'toggle-table': {
  const table = db.tables.find(t => t.number === Number(val));
  if (!table) break;
  table.active = !table.active;
  if (ui.table === table.number && !table.active) ui.table = db.tables.find(t => t.active)?.number ?? null;
  if (ui.table === null && table.active) ui.table = table.number;
  save();render();break;
 }
 case 'test-table':{const table=db.tables.find(t=>t.number===Number(val));if(!table?.active){alert('This table is paused. Activate it to open the guest preview.');break;}ui.table=Number(val);ui.modal=null;db.events.qrPreviews++;save();flipSurface('guest');break}
 case 'copy-qr':{const link=`https://example.com/${restaurantId}?table=${pad(val)}`;try{const copied=await copyText(link);renderToastOnly(copied===false?'Unable to copy the placeholder link':'Copied placeholder link');}catch{renderToastOnly('Unable to copy the placeholder link');}break}
 case 'analytics-export':downloadPayload(trafficDataset(),'Foodie_Atticoo_'+restaurantId+'_'+(ui.analyticsMode==='sample'?'Example':'Local')+'_Traffic.json');break;
 case 'owner-translations':ui.editor=db.dishes[0]?.id||'new';render();root.querySelector('.editor-language-group')?.scrollIntoView({block:'start'});break;
 case 'export':downloadJSON();break;
 case 'reset':if(confirm('Reset all saved menu edits, carts, events, requests and interactions for '+db.restaurant+' in this browser? Other restaurant profiles will remain unchanged.')){db=clone(DEFAULT_DB);ui.category='all';ui.selected=restaurantProfile ? 'mizora-03' : 'roasted-salmon';ui.table=7;ui.filter='all';ui.search='';ui.guestFilters=emptyFilters();ui.appearanceDraft=null;ui.appearanceStatus='';ui.mediaDish=null;ui.mediaDraft=null;ui.mediaError='';ui.mediaFilter='all';ui.eventEditor=null;ui.eventDraft=null;ui.eventFilter='all';ui.qrFilter='all';ui.qrSearch='';ui.viewAdded=false;ui.lang='en';save();render()}break;
 default:break;
}}
root.addEventListener('change',ev=>{
  const input=ev.target;
  if(input.id==='media-dish-select'){ui.mediaDish=input.value;ui.mediaDraft=null;ui.mediaError='';render();return;}
  if(input.dataset.dishCategory){const item=dish(input.dataset.dishCategory);if(item&&CATS.slice(1).some(c=>c.id===input.value)){item.category=input.value;save();render();}return;}
  if(input.dataset.dishPrice){const item=dish(input.dataset.dishPrice),price=Number(input.value);if(item&&input.value!==''&&input.checkValidity()&&Number.isFinite(price)&&price>=0&&price<=999){item.price=price;if(restaurantProfile)item.menuMatched=false;save();render();}else input.reportValidity();}
});
root.addEventListener('input',ev=>{
  if(ev.target.form?.id==='event-form'){const data=new FormData(ev.target.form);ui.eventDraft={id:ui.eventEditor,title:String(data.get('title')||''),date:String(data.get('date')||''),time:String(data.get('time')||''),description:String(data.get('description')||''),published:data.has('published')};}
  if(ev.target.form?.id==='media-request-form'){const data=new FormData(ev.target.form);ui.mediaDraft={requestedChanges:data.getAll('change'),note:String(data.get('note')||''),priority:String(data.get('priority')||'normal')};}
});
root.addEventListener('submit',ev=>{
  if(ev.target.id!=='media-request-form')return;
  ev.preventDefault();const form=ev.target,data=new FormData(form),item=dish(form.dataset.dish);
  if(!item)return;
  const mediaId=item.customPhoto||item.media?.overview||(SEED.some(d=>d.id===item.id)?'assets/overview/'+item.id+'.webp':'');
  if(!mediaId){ui.mediaError='This dish needs a photograph before requesting an update.';render();return;}
  try{const request=createMediaRequest({restaurantId,dishId:item.id,mediaId,requestedChanges:data.getAll('change'),note:String(data.get('note')||''),priority:String(data.get('priority')||'normal'),createdAt:new Date().toISOString()});
    db.mediaRequestLog.push({...request,id:uid()});db.mediaRequests[item.id]='requested';ui.mediaDraft=null;ui.mediaError='';ui.mediaFilter='all';save();render();root.querySelector('#media-request-form .primary-btn')?.focus({preventScroll:true});renderToastOnly('Update request saved locally');
  }catch{ui.mediaError='Select at least one change for this photograph.';render();document.getElementById('media-request-error')?.scrollIntoView({block:'nearest'});}
});
root.addEventListener('submit',ev=>{
  if(ev.target.id!=='event-form')return;
  ev.preventDefault();const form=ev.target,data=new FormData(form);
  const title=String(data.get('title')||'').trim(),date=String(data.get('date')||''),time=String(data.get('time')||''),description=String(data.get('description')||'').trim();
  const parsed=new Date(date+'T12:00:00');
  if(!title||title.length>80){form.elements.title.setCustomValidity('Enter an event title of up to 80 characters.');form.reportValidity();return;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsed.getTime())||[parsed.getFullYear(),pad(parsed.getMonth()+1),pad(parsed.getDate())].join('-')!==date){form.elements.date.setCustomValidity('Choose a valid date.');form.reportValidity();return;}
  if(time&&!/^\d{2}:\d{2}$/.test(time)){form.elements.time.setCustomValidity('Choose a valid time.');form.reportValidity();return;}
  if(description.length>600){form.elements.description.setCustomValidity('Use up to 600 characters.');form.reportValidity();return;}
  const current=db.restaurantEvents.find(item=>item.id===ui.eventEditor);
  const item={id:current?.id||uid(),title,date,time,description,published:data.has('published')};
  if(current)Object.assign(current,item);else db.restaurantEvents.push(item);
  ui.eventEditor=item.id;ui.eventDraft=null;save();render();root.querySelector('#event-form .primary-btn')?.focus({preventScroll:true});
});
root.addEventListener('input',ev=>{if(['event-form','profile-form'].includes(ev.target.form?.id))ev.target.setCustomValidity('');});
root.addEventListener('click',async ev=>{const node=ev.target.closest('[data-act]');if(!node)return;const act=node.dataset.act;if(['close-modal','close-editor'].includes(act)&&ev.target!==node && (node.classList.contains('guest-modal-backdrop')||node.classList.contains('editor-backdrop')))return;ev.preventDefault();if(!root.querySelector('[role="dialog"]'))dialogTrigger=describeAction(node);await handleActions(act,node)});
root.addEventListener('input',ev=>{if(ev.target.form?.id==='appearance-form'){updateAppearancePreview(ev.target);return}if(ev.target.getAttribute('aria-invalid')){ev.target.removeAttribute('aria-invalid');ev.target.removeAttribute('aria-describedby');document.getElementById('nutrition-error').hidden=true}if(ev.target.id==='table-search'){const input=ev.target,a=input.selectionStart,b=input.selectionEnd;ui.qrSearch=input.value;render();const next=document.getElementById('table-search');next?.focus();try{next?.setSelectionRange(a,b)}catch{}}if(ev.target.id==='owner-search'){const input=ev.target;const a=input.selectionStart,b=input.selectionEnd;ui.search=input.value;render();const next=document.getElementById('owner-search');next?.focus();try{next?.setSelectionRange(a,b)}catch{}}});

root.addEventListener('submit',ev=>{if(ev.target.id==='appearance-form'){ev.preventDefault();saveAppearance(ev.target);return}if(ev.target.id==='dish-form'){ev.preventDefault();const fd=new FormData(ev.target),name=String(fd.get('name')||'').trim(),summary=String(fd.get('summary')||'').trim(),price=Number(fd.get('price')),components=String(fd.get('components')||'').split(',').map(s=>s.trim()).filter(Boolean);if(!name||!summary||!Number.isFinite(price)||price<0)return;const existing=ui.editor==='new'?null:dish(ui.editor),id=existing?.id||uid();const nutrition=readNutritionForm(ev.target,fd);if(nutrition===undefined)return;const record={...(existing||{}),nutrition,...(restaurantProfile ? {menuMatched:!!existing?.menuMatched && existing.name===name && existing.summary===summary && existing.price===price} : {}),id,name,summary,price,components,category:fd.get('category'),live:fd.has('live'),featured:fd.has('featured'),allergens:fd.getAll('allergen'),allergensVerified:fd.has('verified'),dietaryVerified:fd.has('dietaryVerified'),dietary:{...Object.fromEntries(DIET_KEYS.map(k=>[k,fd.has('diet_'+k)])),...(fd.get('spice')!=='' ? {spice:Number(fd.get('spice')||0)} : {})},translations:Object.fromEntries(['de','es'].map(lang=>[lang,{name:String(fd.get(lang+'_name')||'').trim(),summary:String(fd.get(lang+'_summary')||'').trim()}])),customPhoto:existing?.customPhoto||null,source:existing?.source||'Local menu entry'};if(existing)Object.assign(existing,record);else db.dishes.push(record);ui.selected=id;ui.editor=null;save();render();return}if(ev.target.id==='profile-form'){ev.preventDefault();const fd=new FormData(ev.target);const instagramUrl=String(fd.get('instagramUrl')||'').trim();if(instagramUrl&&!validInstagramUrl(instagramUrl)){ev.target.elements.instagramUrl.setCustomValidity('Enter an HTTPS Instagram profile URL.');ev.target.elements.instagramUrl.reportValidity();return;}const reviewUrl=String(fd.get('reviewUrl')||'').trim();if(reviewUrl&&!validReviewUrl(reviewUrl)){ev.target.elements.reviewUrl.setCustomValidity('Enter an HTTPS Google review link (google.com, g.page or maps.app.goo.gl).');ev.target.elements.reviewUrl.reportValidity();return;}db.instagramUrl=instagramUrl;db.reviewUrl=reviewUrl;db.reviewEnabled=fd.has('reviewEnabled');save();render();renderToastOnly('Feedback settings saved locally')}});
root.addEventListener('scroll',ev=>{if(ev.target.id==='overview-scroll')ui.overviewScroll=ev.target.scrollTop;if(ev.target.id==='quick-tabs')ui.categoryScroll=ev.target.scrollLeft},true);
let exploreTouch=null,lastWheel=0;
const isExploreGestureTarget=target=>ui.surface==='guest'&&ui.mode==='explore'&&!ui.modal&&target.closest('.explore-hero')&&!target.closest('button,a,input,select,textarea,[contenteditable]');
root.addEventListener('touchstart',ev=>{
  exploreTouch=null;
  if(ev.touches.length!==1||!isExploreGestureTarget(ev.target))return;
  const touch=ev.touches[0];
  // Keep browser back/forward gestures at the physical screen edges.
  if(touch.clientX<24||touch.clientX>window.innerWidth-24)return;
  exploreTouch={id:touch.identifier,x:touch.clientX,y:touch.clientY,dish:ui.selected,time:performance.now(),axis:null};
},{passive:true});
root.addEventListener('touchmove',ev=>{
  if(!exploreTouch)return;
  if(ev.touches.length!==1||!isExploreGestureTarget(ev.target)){exploreTouch=null;return;}
  const touch=ev.touches[0],dx=Math.abs(touch.clientX-exploreTouch.x),dy=Math.abs(touch.clientY-exploreTouch.y);
  if(!exploreTouch.axis&&Math.max(dx,dy)>12)exploreTouch.axis=dx>dy*1.3?'x':'y';
  // Scope Safari's fallback to a single finger on the dish, preserving pinch zoom and inner scrollers.
  if(ev.cancelable)ev.preventDefault();
},{passive:false});
root.addEventListener('touchcancel',()=>{exploreTouch=null;},{passive:true});
root.addEventListener('touchend',ev=>{
  const start=exploreTouch;exploreTouch=null;
  if(!start||ev.touches.length||!isExploreGestureTarget(ev.target)||start.dish!==ui.selected||performance.now()-start.time>1200)return;
  const touch=[...ev.changedTouches].find(t=>t.identifier===start.id);if(!touch)return;
  const dx=start.x-touch.clientX,dy=start.y-touch.clientY;
  if(start.axis!=='y'&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3)turnDish(dx>0?1:-1);
},{passive:true});
root.addEventListener('wheel',ev=>{
  if(ev.ctrlKey||!isExploreGestureTarget(ev.target)||Math.abs(ev.deltaX)<=Math.abs(ev.deltaY))return;
  if(ev.cancelable)ev.preventDefault();
  const now=performance.now();if(Math.abs(ev.deltaX)>12&&now-lastWheel>650){lastWheel=now;turnDish(ev.deltaX>0?1:-1);}
},{passive:false});
document.addEventListener('keydown',ev=>{
  const dialog=root.querySelector('[role="dialog"]');
  if(dialog && ev.key==='Tab'){
    const controls=[...dialog.querySelectorAll('button, a[href], input, select, textarea')].filter(el=>!el.disabled && el.getClientRects().length);
    const boundary=ev.shiftKey ? controls[0] : controls.at(-1);
    if(document.activeElement===boundary || !controls.includes(document.activeElement)){
      ev.preventDefault();(ev.shiftKey ? controls.at(-1) : controls[0])?.focus();
    }
    return;
  }
  if(ev.key==='Escape'){if(ui.modal){ui.modal=null;render()}else if(ui.editor){ui.editor=null;render()}return}if(ui.surface==='guest'&&ui.mode==='explore'&&!ui.modal&&['ArrowLeft','ArrowRight'].includes(ev.key)&&!document.activeElement?.closest('input,select,textarea,[contenteditable],#quick-tabs')){ev.preventDefault();turnDish(ev.key==='ArrowRight'?1:-1)}});
if (ui.surface === 'guest') event('views');
render();
})();
