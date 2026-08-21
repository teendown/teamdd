from enum import IntFlag

import comtypes.gen._00020430_0000_0000_C000_000000000046_0_2_0 as __wrapper_module__
from comtypes.gen._00020430_0000_0000_C000_000000000046_0_2_0 import (
    Color, FontEvents, DISPPROPERTY, Default, FONTNAME,
    OLE_XSIZE_PIXELS, _check_version, IFontEventsDisp, OLE_CANCELBOOL,
    IEnumVARIANT, IDispatch, _lcid, IFontDisp, StdFont, GUID,
    DISPPARAMS, Library, COMMETHOD, Font, FONTUNDERSCORE, FONTSIZE,
    Monochrome, DISPMETHOD, FONTSTRIKETHROUGH, Picture,
    OLE_XPOS_CONTAINER, OLE_ENABLEDEFAULTBOOL, BSTR,
    OLE_YPOS_HIMETRIC, OLE_XSIZE_HIMETRIC, Checked, IPictureDisp,
    IPicture, FONTITALIC, VgaColor, dispid, typelib_path, Gray,
    VARIANT_BOOL, CoClass, OLE_OPTEXCLUSIVE, OLE_YSIZE_PIXELS,
    HRESULT, EXCEPINFO, OLE_YSIZE_CONTAINER, OLE_XPOS_HIMETRIC,
    Unchecked, OLE_HANDLE, OLE_YPOS_PIXELS, OLE_COLOR, StdPicture,
    IFont, OLE_YPOS_CONTAINER, FONTBOLD, IUnknown,
    OLE_XSIZE_CONTAINER, OLE_YSIZE_HIMETRIC, OLE_XPOS_PIXELS
)


class OLE_TRISTATE(IntFlag):
    Unchecked = 0
    Checked = 1
    Gray = 2


class LoadPictureConstants(IntFlag):
    Default = 0
    Monochrome = 1
    VgaColor = 2
    Color = 4


__all__ = [
    'Color', 'FontEvents', 'Checked', 'Default', 'IPictureDisp',
    'FONTNAME', 'IPicture', 'FONTITALIC', 'OLE_XSIZE_PIXELS',
    'VgaColor', 'IFontEventsDisp', 'OLE_CANCELBOOL',
    'LoadPictureConstants', 'typelib_path', 'Gray',
    'OLE_YSIZE_HIMETRIC', 'IFontDisp', 'OLE_OPTEXCLUSIVE', 'StdFont',
    'OLE_YSIZE_PIXELS', 'OLE_YSIZE_CONTAINER', 'OLE_TRISTATE',
    'OLE_XPOS_HIMETRIC', 'Library', 'Font', 'Unchecked',
    'FONTUNDERSCORE', 'FONTSIZE', 'OLE_HANDLE', 'OLE_YPOS_PIXELS',
    'OLE_COLOR', 'StdPicture', 'Monochrome', 'IFont',
    'OLE_YPOS_CONTAINER', 'Picture', 'FONTBOLD', 'OLE_XPOS_CONTAINER',
    'FONTSTRIKETHROUGH', 'OLE_XSIZE_CONTAINER',
    'OLE_ENABLEDEFAULTBOOL', 'OLE_YPOS_HIMETRIC', 'OLE_XPOS_PIXELS',
    'OLE_XSIZE_HIMETRIC'
]

