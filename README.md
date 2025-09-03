# Installation  
git clone like you normally do to the `custom_nodes` folder:  
`git clone https://github.com/CoreyCorza/ComfyUI-CRZnodes.git`  

There are no requirements.  

Or install via the comfyui manager using url    `https://github.com/CoreyCorza/ComfyUI-CRZnodes.git`
<img width="1886" height="1507" alt="image" src="https://github.com/user-attachments/assets/caa4594e-b65a-4ca1-8f98-5e903a97251a" />

# Search
All nodes can be found easily by searching for "crz"
<img width="1237" height="728" alt="image" src="https://github.com/user-attachments/assets/9ca8c9ab-ed4b-436b-a69b-179759cb573c" />


# Dashboard Nodes
- Boolean Toggle
- Float Slider
- Integer Slider
- Dropdown
- Custom Dropdown (user defined)
- Switch
- Image Selector 
- Dashboard Node (experimental, see note down the bottom of page)  
<img width="1116" height="1154" alt="image" src="https://github.com/user-attachments/assets/66fee248-24c4-4ed6-9a61-5b5c29fa05ee" />


#### Configuring
To change the min/max range of the sliders, double click on the slider handle.  
The description tells you what each value represents.  
Here the min is 1, the max is set to 10, and the slider handle will step in increments of 1.  
<img width="975" height="324" alt="image" src="https://github.com/user-attachments/assets/d06d0f11-c8ef-4731-bf06-0c034ef47c9e" />  

Same with the float slider.  
Min, max, step increments, and how many decimal places.  
<img width="1152" height="401" alt="image" src="https://github.com/user-attachments/assets/c286569b-7973-46a0-86ec-5f2a82e77da4" />  

**Custom Dropdown Node** Configure your own custom dropdowns with items seperated by commas.  
Currently supports strings, ints and floats
<img width="1351" height="441" alt="brave_Lrfz41D0Jp" src="https://github.com/user-attachments/assets/f0675d2b-7e9e-4aa2-b6a5-f95d15d8fa57" />
<img width="714" height="305" alt="brave_io7CVTrxIc" src="https://github.com/user-attachments/assets/c8dd8b19-e9a9-4846-8005-535934c7608d" />

To give these nodes custom labels, double click on the text
<img width="1016" height="370" alt="image" src="https://github.com/user-attachments/assets/977c6554-e502-4547-a10e-d52ed125130b" />



# Passthrough Node
The passthrough node is basically just a reroute but hides connections.   
Hover over a passthrough node to see connections.  
Hold CTRL while hovering over a passthrough node to see all connections for all passthrough nodes  
![brave_2oqCzWCjcw](https://github.com/user-attachments/assets/f410ca6c-0ac9-4b67-bcf2-5268b3b7b998)

Passthrough nodes will show text above them if you change their titles.  
Right-click on passthrough node > Properties Panel > Edit the title
<img width="1253" height="670" alt="image" src="https://github.com/user-attachments/assets/2b2cacfe-8f25-45de-8114-dfece7c7ec4c" />

# Dropdowns
Dropdowns automatically inherit the list from whatever they were connected to.   
There may be cases where they don't - Let me know.
![brave_9tTWzrNDJL](https://github.com/user-attachments/assets/03418919-c909-42ea-a02d-83c39e25333c)

# Preferences
A `CRZ` button should be shown in the bottom left corner of the viewport.  
You can also summon the preferences with ctrl+shift+c.  
Not sure about this keyboard shortcut as some people might use that for other things. If its a problem let me know.
![brave_7tEkczIbU8](https://github.com/user-attachments/assets/eb844abc-f997-4031-910a-652bb4f7ac02)


# Dang Badges..
I dont usually have node badges on. They're useful to see what nodes came from where.. but they clutter everything. They are visual clutter..
They get in the way, they force me to have nodes further apart etc.
So I usually have node badges turned off, otherwise you end up with this
<img width="894" height="722" alt="image" src="https://github.com/user-attachments/assets/2e4ff48b-f640-4f47-9291-657ea0829a40" />

# Experimental
The dashboard node should just automatically detect what its connected to and change its type.  
Meant to be any all-in-one replacement for the other individual dashboard nodes. But I dont want to break my old workflows just yet, and haven't tested it much.  
So it does its own thing for now.
![brave_B9bUJKXOM1](https://github.com/user-attachments/assets/efc795a0-95cc-4c6c-8ab9-87b79fe41a8c)

