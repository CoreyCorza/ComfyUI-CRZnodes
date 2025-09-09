# Installation  
git clone like you normally do to the `custom_nodes` folder:  
`git clone https://github.com/CoreyCorza/ComfyUI-CRZnodes.git`  

There are no requirements.  

Or install via comfyui extensions
![brave_TZvsdaSU01](https://github.com/user-attachments/assets/1ae0213d-ab3f-4d42-8f85-1c374d904695)

Or install via comfyui manager
<img width="1669" height="402" alt="image" src="https://github.com/user-attachments/assets/f4a08987-5966-483e-8d51-cc9894208dda" />



# Search
All nodes can be found easily by searching for `crz`
<img width="1246" height="859" alt="image" src="https://github.com/user-attachments/assets/86f6e564-e624-4acf-a9d7-5e51c4a23738" />



# Dashboard Nodes
- Boolean Toggle
- Float Slider
- Integer Slider
- Dropdown
- Custom Dropdown (user defined)
- Map Custom Dropdown
- Image Selector 
- Dashboard Node (experimental, see note down the bottom of page)
- Compact int-to-float / float-to-int
- Passthrough
- Compare
- Switch
- Execute Switch
- Execute Block
<img width="1010" height="1209" alt="image" src="https://github.com/user-attachments/assets/b4015cf8-e8f1-40e5-83cd-b37555d94941" />




#### Configuring Sliders
To change the min/max range of the sliders, double click on the slider handle/track.  
The description lets you know what each value represents.  
Here the min is 1, the max is set to 10, and the slider handle will step in increments of 1.  
<img width="975" height="324" alt="image" src="https://github.com/user-attachments/assets/d06d0f11-c8ef-4731-bf06-0c034ef47c9e" />  

Same with the float slider.  
Min, max, step increments, and how many decimal places.  
<img width="1152" height="401" alt="image" src="https://github.com/user-attachments/assets/c286569b-7973-46a0-86ec-5f2a82e77da4" />  

#### Configuring Custom Dropdown Nodes
Configure your own custom dropdowns with items seperated by commas.  
Currently supports strings, ints and floats
<img width="1351" height="441" alt="brave_Lrfz41D0Jp" src="https://github.com/user-attachments/assets/f0675d2b-7e9e-4aa2-b6a5-f95d15d8fa57" />
<img width="714" height="305" alt="brave_io7CVTrxIc" src="https://github.com/user-attachments/assets/c8dd8b19-e9a9-4846-8005-535934c7608d" />


#### Mapping custom dropdowns to pass different data
To make it a little easier working with custom dropdown downs, you can use a `Map Custom Dropdown` node  
It will autodetect your custom dropdown choices. And it will pass through the data you want for each option  
![brave_Ll420CN2SL](https://github.com/user-attachments/assets/e0ec9818-82f1-4266-8581-80e62e8a0fb0)




To give nodes custom labels, double click on the text
<img width="1016" height="370" alt="image" src="https://github.com/user-attachments/assets/977c6554-e502-4547-a10e-d52ed125130b" />

#### Compare
Comparison node for checking users input and switching data using the boolean result.  
Double click the compare node to modify the comparison type.  

| Symbol | Meaning                        |
|--------|--------------------------------|
| >      | Is A greater than B?           |
| <      | Is A less than B?              |
| >=     | Is A greater than or equal to B? |
| <=     | Is A less than or equal to B?  |
| =      | Does A equal B?                |


![brave_Iy6iNYmtfn](https://github.com/user-attachments/assets/aa78d3bf-cdf5-49bd-a9dc-419a3c5b3b62)
![brave_rz94tRuHMj](https://github.com/user-attachments/assets/61eb463d-b097-4bae-931e-376092ce6336)

#### Switch
Switches input data.  
First input socket is True, second input socket is False.
![brave_JdJfFl2gK1](https://github.com/user-attachments/assets/2eeab7a4-e4ac-4e2a-b3ab-63c223ddda8d)

#### Execute Switch
Only runs downstream nodes for the active output.  
First output socket is True, second output socket is False.
![brave_qn8I8NEnjL](https://github.com/user-attachments/assets/f63c2560-abbe-4145-8be6-0906c6e62a3e)

#### Execute Block
Blocks downstream nodes from running.  
![brave_LIs0vyfoe6](https://github.com/user-attachments/assets/6fcbbe82-e032-4dd8-9270-b13becc32ef9)





# Passthrough Node
The passthrough node is basically just a reroute but hides connections.   
Hover over a passthrough node to see connections.  
![brave_2oqCzWCjcw](https://github.com/user-attachments/assets/f410ca6c-0ac9-4b67-bcf2-5268b3b7b998)

Double click on passthrough nodes to give them a title
![brave_BvbHJuIC8K](https://github.com/user-attachments/assets/c1b58328-eb94-4663-ad06-d49367da0cf2)


# Dropdowns
Dropdowns automatically inherit the list from whatever they were connected to.   
There may be cases where they don't - Let me know.
![brave_9tTWzrNDJL](https://github.com/user-attachments/assets/03418919-c909-42ea-a02d-83c39e25333c)

# Preferences
**By default, link visibility may be off for dashboard nodes. You can turn them on here**  
There is also a shortcut to toggle them quickly: `alt+backtick`.  
You can change this shortcut in comfyui's preferences by searching for `crz`.  See note below.  
![brave_xIgGKTvvjW](https://github.com/user-attachments/assets/e052fb4e-88be-456a-895b-a048de119223)



# Dang Badges..
I dont usually have node badges on. They're useful to see what nodes came from where.. but they clutter everything. They are visual clutter..
They get in the way and they force me to have nodes spread out.
So I usually have node badges turned off, otherwise you end up with this
<img width="894" height="722" alt="image" src="https://github.com/user-attachments/assets/2e4ff48b-f640-4f47-9291-657ea0829a40" />

# Experimental
The dashboard node should just automatically detect what its connected to and change its type.  
Meant to be an all-in-one replacement for the other individual dashboard nodes. But I dont want to break my old workflows just yet, and haven't tested it much.  
So it does its own thing for now.
![brave_B9bUJKXOM1](https://github.com/user-attachments/assets/efc795a0-95cc-4c6c-8ab9-87b79fe41a8c)

# Noteable Changes
## 5th Sept 2025  

If a text display is truncated on a node, a tooltip will appear on mouse hover showing the full text now.  
![brave_MyyMf8NVaT](https://github.com/user-attachments/assets/45c4269e-67c2-472d-973d-4a9a59052587)

Keyboard shortcuts integrated into Comfyui. Search for `crz`
<img width="1157" height="954" alt="brave_wukdUzz8hF" src="https://github.com/user-attachments/assets/30cfd658-6d91-488c-8c01-2f284d1709ec" />

Settings moved to the sidebar
![brave_UASrjUa0AF](https://github.com/user-attachments/assets/09ac5a36-c34d-4d55-823e-f9dd2a321873)




# Credit
Inspired by everyone. Credit to everyone  
https://github.com/comfyanonymous/ComfyUI  
https://github.com/Smirnov75/ComfyUI-mxToolkit  
https://github.com/chrisgoringe/cg-use-everywhere  
https://github.com/rgthree/rgthree-comfy  
https://github.com/yolain/ComfyUI-Easy-Use  
..and others I cant think of right now  


