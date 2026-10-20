import React from 'react'
export default function HotelVoucherLoader() {
  return (
    <div>
      <div className='placeholder-glow'>
        <span className='placeholder col-12 rounded' style={{height : '10em'}}/>
        <span className='placeholder col-12 rounded mt-3' style={{height : '10em'}}/>

        <div className='row mt-3'>
            <div className='col-md-4 col-12 mb-2'>
                <span className='placeholder col-12 bg-warning rounded' style={{height : '7em'}}/>
            </div>
            <div className='col-md-4 col-12 mb-2'>
                <span className='placeholder col-12 bg-warning rounded' style={{height : '7em'}}/>
            </div>
            <div className='col-md-4 col-12 mb-2'>
                <span className='placeholder col-12 bg-warning rounded' style={{height : '7em'}}/>
            </div>
            <div className='col-12'>
                <span className='placeholder col-12 mt-3 rounded' style={{height : '2em'}}/>
                <span className='placeholder col-12 mt-2  rounded' style={{height : '2em'}}/>
                <span className='placeholder col-12 mt-2  rounded' style={{height : '2em'}}/>
            </div>
            <div className='col-12 mt-3 '>
                <span className='placeholder col-12 bg-primary  rounded' style={{height : '10em'}}/>
            </div>
        </div>
      </div>
    </div>
  )
}
