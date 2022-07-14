import {worldModel} from 'video_overlay.js';
function Rect() {
    return  <div style={{
        width:'50px', 
        height:'50px', 
        border:'1px solid #000', 
        color:'white', 
        position:'absolute',
        // margin-left:worldModel["RedWalker"]

    }}></div>;
}
const domContainer = document.querySelector('#rect_container');
const root = ReactDOM.createRoot(domContainer);
root.render(<Rect />);