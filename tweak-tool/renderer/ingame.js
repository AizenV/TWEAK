// Beste Ingame-Einstellungen für maximale Performance (FPS / niedrige Latenz), pro Spiel-ID.
// Format: id: { n: 'Hinweis', s: [ ['Gruppe', [ ['Einstellung','Wert'], … ]], … ] }
// Richtwerte: Bezeichnungen können sich mit Spiel-Updates leicht ändern. Texturen immer nach VRAM wählen.
(function(){
const D=['Anzeigemodus','Vollbild'],V=['VSync','Aus'];
window.INGAME={
cs2:{n:'Auf Max-FPS getrimmt. Schatten „Hoch“ lassen, damit Spieler-Schatten um Ecken sichtbar bleiben.',s:[
 ['Anzeige',[D,['Auflösung','Nativ (oder 1280×960 gestreckt für mehr FPS)'],V,['NVIDIA Reflex Low Latency','Aktiviert + Boost'],['Max FPS (Konsole)','fps_max 0']]],
 ['Grafik',[['Boost Player Contrast','An'],['Globale Schattenqualität','Hoch'],['Modell-/Texturdetail','Niedrig'],['Texturfilterung','Bilinear / Anisotrop 4x'],['Shader-Detail','Niedrig'],['Partikeldetail','Niedrig'],['Umgebungsverdeckung','Deaktiviert'],['Hohe Dynamikreichweite','Leistung'],['Multisampling-Anti-Aliasing','CMAA2 (max. FPS) oder 4x'],['FidelityFX Super Resolution','Deaktiviert']]]]},
valorant:{n:'Sehr genügsames Spiel – damit laufen auch schwache PCs flüssig.',s:[
 ['Allgemein',[D,['Begrenze FPS im Spiel','Aus'],['NVIDIA Reflex','An (Ein + Boost)'],V]],
 ['Grafikqualität',[['Material-Qualität','Niedrig'],['Textur-Qualität','Niedrig (Mittel ab 6 GB VRAM)'],['Detail-Qualität','Niedrig'],['UI-Qualität','Niedrig'],['Vignette','Aus'],['Anti-Aliasing','Keins (oder MSAA 2x)'],['Anisotrope Filterung','1x'],['Klarheit verbessern','Aus'],['Bloom','Aus'],['Verzerrung','Aus'],['Schatten werfen','Aus']]]]},
fortnite:{n:'„Leistung“-Rendermodus bringt auf den meisten PCs die höchsten FPS.',s:[
 ['Anzeige',[D,['Rendermodus','Leistung (niedrigere Grafikqualität)'],['3D-Auflösung','100 % (schwacher PC: 75–85 %)'],V,['Bildratenbegrenzung','Monitor-Hz oder unbegrenzt'],['NVIDIA Reflex','Ein + Boost']]],
 ['Grafik',[['Sichtweite','Mittel'],['Schatten','Aus'],['Anti-Aliasing','Aus'],['Texturen','Niedrig (Mittel ab 6 GB VRAM)'],['Effekte','Niedrig'],['Nachbearbeitung','Niedrig'],['Nanite / Virtuelle Schatten','Aus'],['Globale Beleuchtung / Reflexionen','Aus'],['Hardware-Raytracing','Aus'],['Bewegungsunschärfe','Aus']]]]},
apex:{n:'DX11 ist oft stabiler als DX12. Texturstreaming an den VRAM anpassen.',s:[
 ['Anzeige',[D,['Bildratenlimit','Unbegrenzt (oder Hz − 3)'],V,['NVIDIA Reflex','Aktiviert + Boost'],['Adaptive Auflösung (FPS-Ziel)','0 (aus)'],['Sichtfeld','100–110']]],
 ['Grafik',[['Anti-Aliasing','Keins / TSAA'],['Texturstreaming-Budget','Nach VRAM (4 GB → „Hoch“ 3 GB)'],['Texturfilterung','Bilinear'],['Umgebungsverdeckung','Deaktiviert'],['Sonnenschatten-Abdeckung','Niedrig'],['Sonnenschatten-Detail','Niedrig'],['Spot-Schatten-Detail','Deaktiviert'],['Volumetrischer Nebel','Deaktiviert'],['Dynamische Spot-Schatten','Deaktiviert'],['Modelldetail','Niedrig'],['Effektdetail','Niedrig'],['Einschlagsmarkierungen','Niedrig'],['Ragdolls','Niedrig']]]]},
warzone:{n:'Nach Treiber-/Spiel-Updates Shader neu kompilieren lassen.',s:[
 ['Anzeige',[['Anzeigemodus','Vollbild (exklusiv)'],V,['NVIDIA Reflex','Ein + Boost'],['Upscaling','DLSS/FSR „Qualität“ bei Bedarf'],['Sichtfeld','100–120']]],
 ['Qualität',[['Texturauflösung','Normal / Niedrig'],['Texturfilter anisotrop','Normal'],['Partikelauflösung','Niedrig'],['Einschuss- & Spray-Effekte','Aus'],['Tessellation','Aus'],['On-Demand Texture Streaming','Aus'],['Schatten (alle)','Niedrig / Aus'],['Umgebungsverdeckung','Aus'],['Screen Space Reflections','Aus'],['Bewegungsunschärfe (Welt/Waffe)','Aus'],['Tiefenschärfe','Aus'],['Filmkorn','0'],['Anti-Aliasing','Filmic SMAA T2X']]]]},
gta5:{n:'Alte Engine: Ambient Occlusion, Tessellation und Schatten kosten am meisten.',s:[
 ['Grafik',[D,V,['MSAA','Aus (FXAA an)'],['Textur-Qualität','Hoch (nach VRAM)'],['Shader-Qualität','Normal'],['Schatten-Qualität','Normal'],['Reflexions-Qualität','Normal'],['Reflexions-MSAA','Aus'],['Wasser-Qualität','Normal'],['Partikel-Qualität','Normal'],['Gras-Qualität','Normal'],['Weiche Schatten','Schärfste'],['Nachbearbeitung','Normal'],['Anisotrope Filterung','4x'],['Ambient Occlusion','Aus'],['Tessellation','Aus'],['Bevölkerungsdichte','Mittel'],['Distanzskalierung','50–70 %']]],
 ['Erweitert',[['Lange Schatten','Aus'],['Hochauflösende Schatten','Aus'],['Erweiterte Schattendistanz','Aus'],['Hochdetail-Streaming beim Fliegen','Aus'],['Tiefenschärfe','Aus']]]]},
r6:{n:'Vulkan testen, falls DX11 ruckelt.',s:[
 ['Anzeige',[D,['Auflösung','Nativ'],V,['FPS-Limit','Aus'],['Render-Skalierung','100 %'],['NVIDIA Reflex','An']]],
 ['Qualität',[['Texturqualität','Hoch (nach VRAM)'],['Texturfilterung','Anisotrop 4x'],['LOD-Qualität','Niedrig'],['Schatten','Niedrig / Mittel'],['Reflexionen','Niedrig'],['Umgebungsverdeckung','Aus'],['Linsenreflexe','Aus'],['Zoom-Tiefenschärfe','Aus'],['Bewegungsunschärfe','Aus'],['Anti-Aliasing','T-AA aus / T-AA 2x']]]]},
rust:{n:'Rust frisst viel RAM – Hintergrundprogramme schließen.',s:[
 ['Allgemein',[['Fenstermodus','Exklusiver Vollbildmodus'],V,['FPS-Limit','Unbegrenzt'],['Sichtfeld','80–90']]],
 ['Grafik',[['Grafikqualität','Niedrig (0–1)'],['Sichtweite (Draw Distance)','1500 oder weniger'],['Schatten-Kaskaden','Keine / 2'],['Schattendistanz','100–150'],['Max. Schattenlichter','0–5'],['Anisotrope Filterung','Aus'],['Anti-Aliasing','Aus / SMAA'],['Parallax-Mapping','Aus'],['Gras-Verdrängung / Gras-Schatten','Aus'],['Wasserqualität / Reflexionen','0'],['SSAO','Aus'],['Sonnenstrahlen','Aus'],['Bewegungsunschärfe','Aus'],['Tiefenschärfe','Aus'],['Partikelqualität','Niedrig']]]]},
tarkov:{n:'Auf SSD installieren. Texturen nach VRAM, Objekt-LOD nicht zu niedrig (Sicht auf Gegner).',s:[
 ['Grafik',[D,V,['Gesamtsichtweite','500–1000'],['Schattensichtweite','40–60'],['Objekt-LOD-Qualität','2–2,5'],['Schattenqualität','Niedrig'],['Texturqualität','Mittel / Hoch'],['Anti-Aliasing','TAA Hoch oder DLSS/FSR'],['Z-Blur / Chromatische Aberration / Rauschen','Aus'],['SSAO / SSR','Aus'],['Anisotrope Filterung','Pro Textur'],['Auto RAM Cleaner','An']]]]},
ow2:{n:'„Reduce Buffering“ senkt die Eingabeverzögerung deutlich.',s:[
 ['Anzeige',[D,['Render-Skalierung','100 %'],V,['Dreifachpufferung','Aus'],['Reduce Buffering','An'],['NVIDIA Reflex','An'],['FPS-Limit','Benutzerdefiniert (Hz + Reserve)'],['Sichtfeld','103']]],
 ['Qualität',[['Texturqualität','Niedrig / Mittel'],['Texturfilterung','4x'],['Lokale Nebeldetails','Niedrig'],['Dynamische Reflexionen','Aus'],['Schattendetail','Aus'],['Modelldetail','Niedrig'],['Effektdetail','Niedrig'],['Beleuchtungsqualität','Niedrig'],['Antialiasing-Qualität','Aus'],['Refraktionsqualität','Niedrig'],['Bildschirmspiegelung','Aus'],['Ambient Occlusion','Aus']]]]},
lol:{n:'Genügsam – Hauptgewinn ist ein FPS-Limit nahe Monitor-Hz.',s:[
 ['Video',[['Fenstermodus','Vollbild'],['Auflösung','Nativ'],['Framerate-Limit','Monitor-Hz'],['Auf Bildschirmsync warten','Aus'],['Anti-Aliasing','Aus']]],
 ['Grafik',[['Charakterqualität','Sehr niedrig'],['Umgebungsqualität','Sehr niedrig'],['Schatten','Aus'],['Effekte','Niedrig']]]]},
dota2:{n:'DX11 zuerst, Vulkan nur bei Problemen.',s:[
 ['Video',[D,['Rendering-API','DirectX 11'],['Render-Auflösung','100 %'],['Max FPS','Unbegrenzt / Hz + Reserve'],V]],
 ['Qualität',[['Texturqualität','Hoch (nach VRAM)'],['Effektqualität','Niedrig'],['Schattenqualität','Aus'],['Wasserqualität','Niedrig'],['Weltlicht','Aus'],['Umgebungsokklusion','Aus'],['Anti-Aliasing','Aus / FXAA'],['Spielwelt-Detail','Niedrig']]]]},
rl:{n:'FPS auf Hz + Reserve begrenzen glättet die Frametimes.',s:[
 ['Anzeige',[D,V,['FPS-Limit','250 (oder Hz + Reserve)'],['Anti-Aliasing','Aus / FXAA']]],
 ['Qualität',[['Render-Qualität','Hochleistung'],['Render-Detail','Leistung'],['Textur-Detail','Leistung'],['Welt-Detail','Leistung'],['Partikel-Detail','Leistung'],['Effektintensität','Niedrig'],['Umgebungsverdeckung','Aus'],['Tiefenschärfe','Aus'],['Bloom','Aus'],['Lichtstrahlen / Linsenreflexe','Aus'],['Dynamische Schatten','Aus'],['Bewegungsunschärfe','Aus'],['Wettereffekte','Aus'],['Qualitäts-Shader','Aus'],['Kameraschütteln','Aus']]]]},
cyberpunk:{n:'Raytracing/Path Tracing kosten am meisten – für FPS aus lassen und Upscaling nutzen.',s:[
 ['Anzeige',[D,V,['Upscaling','DLSS / FSR / XeSS „Qualität“ oder „Ausgewogen“'],['Frame Generation','Optional (nicht bei schwachen Basis-FPS)'],['Raytracing','Aus']]],
 ['Grafik',[['Texturqualität','Hoch (nach VRAM)'],['Schatten','Niedrig / Mittel'],['Kaskaden-Schattenreichweite','Mittel'],['Entfernte Schatten','Niedrig'],['Volumetrischer Nebel','Niedrig'],['Volumetrische Wolken','Niedrig'],['Bildschirmspiegelungen','Niedrig'],['Spiegelqualität','Niedrig'],['Umgebungsverdeckung','Niedrig / Aus'],['Menschenmengendichte','Niedrig'],['Detailstufe (LOD)','Mittel'],['Filmkorn / Chromat. Aberration / Tiefenschärfe / Bewegungsunschärfe','Aus']]]]},
witcher3:{n:'Für die Next-Gen-Version. HairWorks und Raytracing sind die großen FPS-Fresser.',s:[
 ['Anzeige',[D,V,['Raytracing','Aus'],['Upscaling','DLSS/FSR bei Bedarf']]],
 ['Grafik',[['Texturqualität','Hoch'],['Schattenqualität','Mittel'],['Sichtweite Vegetation','Mittel'],['Grasdichte','Mittel'],['Hintergrund-Charaktere','Mittel / Niedrig'],['Wasserqualität','Mittel'],['Detailstufe','Mittel'],['Ambient Occlusion','SSAO'],['HairWorks','Aus'],['Bewegungsunschärfe / Tiefenschärfe / Chromat. Aberration','Aus']]]]},
eldenring:{n:'FPS ist fest auf 60 begrenzt. Online nur mit aktivem Anti-Cheat, keine Mods.',s:[
 ['Anzeige',[['Anzeigemodus','Vollbild'],['Auflösung','Nativ'],['Raytracing','Aus']]],
 ['Grafik',[['Texturqualität','Mittel / Hoch'],['Antialiasing','Mittel'],['SSAO','Aus / Niedrig'],['Tiefenunschärfe','Aus'],['Bewegungsunschärfe','Aus'],['Schattenqualität','Niedrig / Mittel'],['Beleuchtungsqualität','Mittel'],['Volumetrische Qualität','Niedrig'],['Reflexionsqualität','Niedrig'],['Grasqualität','Niedrig'],['Effektqualität','Niedrig / Mittel']]]]},
rdr2:{n:'Vulkan läuft auf vielen Systemen flüssiger als DX12.',s:[
 ['Anzeige',[['Grafik-API','Vulkan'],D,V,['Auflösungsskalierung','1,0'],['TAA','Mittel (oder FXAA)']]],
 ['Qualität',[['Texturqualität','Hoch (nach VRAM)'],['Anisotrope Filterung','8x'],['Beleuchtungsqualität','Mittel'],['Globale Beleuchtung','Mittel / Niedrig'],['Schattenqualität','Mittel'],['Schatten (Ferne)','Mittel'],['SSAO','Niedrig / Aus'],['Reflexionsqualität','Niedrig'],['Spiegelqualität','Niedrig'],['Wasserqualität','Niedrig'],['Volumetrik','Niedrig'],['Tessellation','Aus'],['Gras-/Baum-LOD','Niedrig'],['Weiche Schatten','Niedrig / Aus'],['Bewegungsunschärfe','Aus']]]]},
pubg:{n:'Texturen auf Mittel lassen, sonst sind Gegner in Büschen schwerer zu erkennen.',s:[
 ['Anzeige',[D,V,['FPS-Limit','Unbegrenzt'],['Render-Skalierung','100'],['DirectX','DX11'],['Schärfen','An'],['Bewegungsunschärfe','Aus']]],
 ['Qualität',[['Anti-Aliasing','Niedrig / Mittel'],['Nachbearbeitung','Sehr niedrig'],['Schatten','Sehr niedrig'],['Texturen','Mittel'],['Effekte','Sehr niedrig'],['Vegetation','Sehr niedrig'],['Sichtweite','Niedrig / Mittel']]]]},
destiny2:{n:'FPS-Limit leicht unter Monitor-Hz setzen für glatte Frametimes.',s:[
 ['Anzeige',[D,V,['FPS-Limit','Hz − 3 oder unbegrenzt'],['Renderauflösung','100 %'],['Anti-Aliasing','SMAA']]],
 ['Qualität',[['Umgebungsverdeckung','Aus'],['Texturqualität','Mittel / Hoch'],['Anisotropie','4x–8x'],['Schattenqualität','Niedrig / Mittel'],['Geländedetail','Niedrig'],['Vegetationsdetail / -schatten','Niedrig'],['Lichtstrahlen','Niedrig'],['Bildschirmreflexionen','Aus'],['Tiefenschärfe / Bewegungsunschärfe','Aus'],['Windimpuls','Aus'],['Chromat. Aberration / Filmkorn','Aus']]]]},
rivals:{n:'Nach Treiber-Updates Shader-Cache leeren.',s:[
 ['Anzeige',[D,['Renderauflösung','100 %'],V,['NVIDIA Reflex','An'],['Upscaling','DLSS/FSR „Qualität“ bei Bedarf'],['Frame Generation','Aus']]],
 ['Qualität',[['Grafikpreset','Niedrig'],['Texturen','Mittel'],['Schatten','Niedrig'],['Globale Beleuchtung','Niedrig / Aus'],['Reflexionen','Aus'],['Nachbearbeitung','Niedrig'],['Effekte','Niedrig'],['Laub','Niedrig'],['Sichtweite','Niedrig'],['Ambient Occlusion','Aus'],['Bewegungsunschärfe','Aus']]]]},
helldivers2:{n:'Texturqualität an den VRAM anpassen.',s:[
 ['Anzeige',[D,V,['Upscaling','DLSS/FSR „Qualität“ oder „Ausgewogen“']]],
 ['Qualität',[['Texturqualität','Nach VRAM'],['Objektdetail','Mittel'],['Schatten','Niedrig / Mittel'],['Beleuchtung','Niedrig'],['Volumetrik / Nebel','Niedrig'],['Partikel / Effekte','Niedrig / Mittel'],['Ambient Occlusion','Aus'],['Bildschirmreflexionen','Aus'],['Anisotrope Filterung','8x'],['Bewegungsunschärfe / Tiefenschärfe','Aus'],['Chromat. Aberration / Filmkorn','Aus']]]]},
bg3:{n:'Vulkan oder DX11 testen, je nach GPU.',s:[
 ['Anzeige',[D,V,['Renderer','DX11 / Vulkan (testen)'],['Upscaling','DLSS/FSR bei Bedarf']]],
 ['Qualität',[['Modellqualität','Mittel'],['Detaildistanz','Niedrig / Mittel'],['Instanzdistanz','Niedrig'],['Texturqualität','Hoch'],['Texturfilterung','Anisotrop 16x'],['Animationsqualität','Niedrig'],['Dynamische Menschenmengen','Aus'],['Schatten','Mittel'],['Wolken / Nebel','Niedrig'],['Tiefenschärfe','Aus']]]]},
hogwarts:{n:'Shader-Kompilierung beim ersten Start abwarten.',s:[
 ['Anzeige',[D,V,['Raytracing','Aus'],['Upscaling','DLSS/FSR „Qualität“'],['Bewegungsunschärfe / Tiefenschärfe / Chromat. Aberration','Aus']]],
 ['Qualität',[['Texturqualität','Hoch (nach VRAM)'],['Effekte','Mittel'],['Schatten','Mittel'],['Nachbearbeitung','Mittel'],['Vegetation','Mittel'],['Material','Mittel'],['Sichtweite','Mittel'],['Himmel / Nebel','Mittel'],['Ambient Occlusion','Mittel']]]]},
bf2042:{n:'„Future Frame Rendering“ aus – es erhöht die Latenz.',s:[
 ['Anzeige',[D,V,['Future Frame Rendering','Aus'],['NVIDIA Reflex','An'],['Sichtfeld','100–105'],['DirectX 12','Testen, ggf. aus']]],
 ['Qualität',[['Texturqualität','Mittel'],['Texturfilterung','Mittel'],['Beleuchtungsqualität','Niedrig'],['Effektqualität','Niedrig'],['Nachbearbeitung','Niedrig'],['Mesh-Qualität','Niedrig'],['Geländequalität','Niedrig'],['Unterholz','Niedrig'],['Antialiasing','TAA Niedrig'],['Ambient Occlusion','Aus'],['Bewegungsunschärfe','0 %'],['Chromat. Aberration / Filmkorn / Vignette / Linsenverzerrung','Aus']]]]},
lethal:{n:'Wenige Grafikoptionen – das Spiel ist sehr leicht.',s:[['Anzeige',[D,V,['Bildratenlimit','Monitor-Hz / unbegrenzt']]]]},
palworld:{n:'Die Startoptionen helfen oft bei Mikro-Rucklern auf Mehrkern-CPUs.',s:[
 ['Anzeige',[D,V,['Upscaling','DLSS/FSR bei Bedarf']]],
 ['Qualität',[['Anti-Aliasing','Mittel (TSR)'],['Texturen','Mittel / Hoch'],['Schatten','Niedrig'],['Effekte','Niedrig'],['Sichtweite','Mittel'],['Laub','Niedrig'],['Globale Beleuchtung / Reflexionen','Niedrig'],['Nachbearbeitung','Niedrig'],['Bewegungsunschärfe','Aus']]]]},
tf2:{n:'Source-Engine: mit „Multikern-Rendering“ deutlich mehr FPS.',s:[
 ['Video',[D,V,['Multikern-Rendering','An'],['Bewegungsunschärfe','Aus'],['HDR','Aus']]],
 ['Qualität',[['Modelldetail','Niedrig'],['Texturdetail','Mittel / Hoch'],['Shader-Detail','Niedrig'],['Wasserdetail','Einfache Reflexionen'],['Schattendetail','Niedrig'],['Farbkorrektur','Aus'],['Anti-Aliasing','Keins / 2x'],['Filterung','Bilinear / Anisotrop 4x']]]]},
l4d2:{n:'Multikern-Rendering unbedingt aktivieren.',s:[
 ['Video',[D,V,['Multikern-Rendering','An'],['Bewegungsunschärfe','Aus']]],
 ['Qualität',[['Modelldetail','Niedrig'],['Texturdetail','Mittel'],['Effektdetail','Niedrig'],['Shader-Detail','Niedrig'],['Schattendetail','Niedrig'],['Anti-Aliasing','Keins'],['Filterung','Bilinear']]]]},
gmod:{n:'Weniger Addons = weniger Ladezeit und Ruckler.',s:[
 ['Video',[D,V,['Multikern-Rendering','An'],['Bewegungsunschärfe','Aus']]],
 ['Qualität',[['Modelldetail','Niedrig'],['Texturdetail','Mittel'],['Shader-Detail','Niedrig'],['Schattendetail','Niedrig'],['Anti-Aliasing','Keins'],['Filterung','Bilinear'],['Konsole','mat_queue_mode 2']]]]},
genshin:{n:'FPS-Limit passend zur Bildwiederholrate setzen.',s:[
 ['Grafik',[D,['Auflösung','Nativ'],['FPS','60 (oder Monitor-Hz)'],V,['Render-Auflösung','1,0 (schwach: 0,8)'],['Schattenqualität','Niedrig / Mittel'],['Visuelle Effekte','Niedrig / Mittel'],['SFX-Qualität','Niedrig'],['Umgebungsdetails','Niedrig / Mittel'],['Anti-Aliasing','SMAA / Aus'],['Volumetrischer Nebel','Aus'],['Reflexionen','Aus'],['Bewegungsunschärfe','Aus'],['Bloom','Aus'],['Menschenmenge','Niedrig'],['Koop-Teammate-Effekte','Aus']]]]},
poe:{n:'Vulkan-Renderer kann in Maps ruhiger laufen.',s:[
 ['Grafik',[D,V,['Renderer','Vulkan'],['Dynamische Auflösung','An (bei schwachem PC)'],['Schattenqualität','Niedrig'],['Beleuchtungsqualität','Niedrig'],['Partikeleffekte','Niedrig'],['Sichtweite','Niedrig / Mittel'],['Anti-Aliasing','Aus / FXAA'],['Max FPS','0 / Hz + Reserve']]]]},
finals:{n:'Raytracing-GI und Frame Generation aus, wenn FPS wichtiger sind.',s:[
 ['Anzeige',[D,['Auflösung','Nativ'],V,['NVIDIA Reflex','An'],['Upscaling','DLSS „Qualität“ / „Leistung“'],['Frame Generation','Aus']]],
 ['Qualität',[['Texturen','Mittel'],['Schatten','Niedrig'],['Globale Beleuchtung','Niedrig'],['Effekte','Niedrig'],['Reflexionen','Aus'],['Nachbearbeitung','Niedrig'],['Laub','Niedrig'],['Sichtweite','Mittel'],['Raytracing-GI','Aus'],['Bewegungsunschärfe','Aus']]]]},
sot:{n:'Nach Treiber-Updates Shader-Cache leeren.',s:[
 ['Anzeige',[D,V,['FPS-Limit','Aus / Hz'],['Sichtfeld','90–100'],['Bewegungsunschärfe','Aus']]],
 ['Qualität',[['Texturqualität','Mittel / Hoch'],['Schatten','Niedrig'],['Wasserdetails','Niedrig'],['Wolkendetails','Niedrig'],['Effekte','Niedrig'],['Nachbearbeitung','Niedrig'],['Anti-Aliasing','Niedrig / FXAA']]]]},
fh5:{n:'Texturen auf den VRAM abstimmen, sonst gibt es Pop-in.',s:[
 ['Anzeige',[['Anzeigemodus','Vollbild'],V,['Auflösungsskalierung','100 %'],['Upscaling','DLSS „Qualität“'],['Dynamische Optimierung','An'],['Raytracing','Aus'],['Bewegungsunschärfe','Aus']]],
 ['Qualität',[['Grafikpreset','Niedrig / Mittel'],['Texturen','Hoch (nach VRAM)'],['Reflexionen','Niedrig'],['Schatten','Mittel'],['Vegetation','Niedrig'],['Umgebungsdistanz','Mittel'],['MSAA','Aus / FXAA'],['Variable Rate Shading','An']]]]},
warframe:{n:'Dynamische Auflösung kann auf schwachen PCs helfen.',s:[
 ['Anzeige',[D,V,['Max FPS','Monitor-Hz'],['Bewegungsunschärfe / Tiefenschärfe / Bloom','Aus']]],
 ['Qualität',[['Texturqualität','Hoch'],['Partikelqualität','Niedrig / Mittel'],['Schattenqualität','Niedrig'],['Ambient Occlusion','Aus'],['Anti-Aliasing','Aus / FXAA']]]]},
dbd:{s:[
 ['Anzeige',[D,V,['FPS-Limit','Unbegrenzt'],['Auflösungsskalierung','100 %']]],
 ['Qualität',[['Texturen','Mittel'],['Effekte','Niedrig'],['Schatten','Niedrig'],['Anti-Aliasing','Niedrig'],['Nachbearbeitung','Niedrig'],['Sichtweite / Laub','Niedrig']]]]},
fallguys:{s:[['Anzeige',[D,['Auflösung','Nativ'],V,['FPS-Limit','Monitor-Hz'],['Qualität','Niedrig / Mittel'],['Anti-Aliasing','Aus']]]]},
satisfactory:{n:'Große Fabriken: Sichtweite und Schatten reduzieren.',s:[
 ['Anzeige',[D,V,['Auflösungsskalierung','100 %'],['Upscaling','DLSS/FSR bei Bedarf']]],
 ['Qualität',[['Sichtweite','Mittel'],['Schatten','Niedrig / Mittel'],['Texturen','Hoch'],['Effekte','Mittel / Niedrig'],['Laub','Mittel'],['Globale Beleuchtung (Lumen)','Aus'],['Anti-Aliasing','TAA / DLSS']]]]},
minecraft:{n:'Java Edition. Mit Fabric + Sodium (+ Lithium) sind oft 2–4x mehr FPS möglich.',s:[
 ['Video-Einstellungen',[D,V,['Max. Bildrate','Unbegrenzt'],['Renderdistanz','8–12 Chunks'],['Simulationsdistanz','5–8 Chunks'],['Grafik','Schnell'],['Weiches Licht','Aus'],['Wolken','Aus'],['Partikel','Minimal'],['Entitäten-Schatten','Aus'],['Biom-Übergang','Aus (1×1)'],['Mipmap-Stufen','0–1'],['Animationen / Himmel / Sonne & Mond','Aus'],['Bobbing / Bildschirm-Wackeln','Aus (Geschmack)'],['Bewegungsunschärfe / Distortion','Aus']]],
 ['Java / Launcher',[['JVM-Argumente','-Xmx4G -XX:+UseG1GC (siehe Tipps)'],['Zugewiesener RAM','4–6 GB (nicht mehr als die Hälfte des PCs)'],['Mods','Fabric + Sodium + Lithium + Iris']]]]},
wow:{n:'In Raids: „Raid- & Schlachtfeld-Grafik“ separat niedriger einstellen.',s:[
 ['System',[D,V,['Grafik-API','DirectX 12'],['Max FPS','Hz + Reserve'],['Hintergrund-FPS','30'],['Anti-Aliasing','CMAA2 / Keins'],['Raytracing','Aus']]],
 ['Qualität',[['Texturauflösung','Hoch'],['Schatten','Niedrig / Fair'],['Flüssigkeitsdetails','Fair'],['Partikeldichte','Niedrig / Fair'],['SSAO','Deaktiviert'],['Tiefeneffekte','Aus'],['Bodenüberzug','Fair'],['Sichtweite','Mittel'],['Raid- & BG-Grafik','Stufe 1–3']]]]},
diablo4:{s:[
 ['Anzeige',[D,V,['Upscaling','DLSS/FSR bei Bedarf'],['Max. Bildrate','Monitor-Hz'],['Dynamische Auflösung','An (schwacher PC)']]],
 ['Qualität',[['Texturen','Hoch / Mittel'],['Schatten','Niedrig'],['Vegetation','Niedrig'],['Nebel','Niedrig'],['Fell','Niedrig'],['Clutter','Niedrig'],['Physik','Niedrig'],['Weiche Schatten','Aus'],['Ambient Occlusion / Bildschirmreflexionen','Aus'],['Verzerrung / Bewegungsunschärfe','Aus']]]]},
roblox:{n:'Grafikstufe manuell statt „Auto“ setzen.',s:[['Grafik',[['Vollbild','F11'],['Grafikmodus','Manuell'],['Grafikqualität','1–3'],['Bildratenlimit','Unbegrenzt / Hz']]]]}
};
// Fallback für Spiele ohne eigenes Profil (z. B. selbst hinzugefügte)
window.INGAME_GENERIC={n:'Allgemeine Empfehlung für maximale FPS – gilt für fast jedes Spiel.',s:[
 ['Anzeige',[['Anzeigemodus','Vollbild (exklusiv)'],['Auflösung','Nativ'],V,['FPS-Limit','Monitor-Hz + Reserve oder unbegrenzt'],['Upscaler (DLSS/FSR)','„Qualität“ nur bei zu wenig FPS'],['NVIDIA Reflex','An, falls vorhanden']]],
 ['Qualität',[['Texturen','Nach VRAM (hoch, wenn der Speicher reicht)'],['Schatten','Niedrig'],['Effekte / Partikel','Niedrig'],['Nachbearbeitung','Niedrig'],['Ambient Occlusion','Aus'],['Raytracing','Aus'],['Anti-Aliasing','Niedrig / FXAA'],['Bewegungsunschärfe / Tiefenschärfe / Filmkorn','Aus']]]]};
})();
