  // Create state

  var state = {
    xoffset: 500,
    yoffset: 0,
    delta: 10,
  };
function Rect() {
    return  <div style={{
        width:'50px', 
        height:'50px', 
        border:'5px solid red', 
        position:'absolute',
        marginLeft: --state.xoffset + 'px',

    }}></div>;
}
const domContainer = document.querySelector('#rect_container');
const root = ReactDOM.createRoot(domContainer);
root.render(<Rect />);